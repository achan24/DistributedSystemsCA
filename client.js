/*
 * server.js
 * Author: Albert Chan
 * Date: 19/04/2024
 * Description: Functionality for connecting new rooms, setting temperatures for individual rooms or all rooms simultaneously, displaying room information, and enabling a chat feature with a chatbot using grpc and the four types of grpc.
 */


const grpc = require('@grpc/grpc-js') //Import grpc-js module from grpc package
const path = require('path') //Import path module
const protoLoader = require('@grpc/proto-loader') //Import proto loader module from grpc package

const PROTO_PATH = path.join(__dirname, 'thermostat.proto') //Define the path to the protocol buffer file
const packageDefinition = protoLoader.loadSync(PROTO_PATH) //Parses the protocol buffer file - contains definitions for all the services and messages defined in the proto file

const thermostatProto = grpc.loadPackageDefinition(packageDefinition) //Loads the package definition object into grpc
const readlineSync = require('readline-sync') //Import readline-sync module for synchronous user input


// create a client instance for the roomService grpc service
const client = new thermostatProto.thermostatPackage.RoomService (
  "localhost:50051", //specify grpc server address and port
  grpc.credentials.createInsecure() //use no credentials for connection
)

// create a client instance for the temperatureService grpc service
const temperatureClient = new thermostatProto.thermostatPackage.TemperatureService(
  "localhost:50051", //specify grpc server address and port
  grpc.credentials.createInsecure() //use no credentials for connection
)

// create a client instance for the chatService grpc service
const chatClient = new thermostatProto.thermostatPackage.ChatService(
  "localhost:50051", //specify grpc server address and port
  grpc.credentials.createInsecure() //use no credentials for connection
)


// Main function and menu
// Asynchronous to accomodate methods that rely on asynchronous functionality
async function main() {

  console.log("\n***************************************")
  console.log("  Welcome to the Smart Thermostat app  ")
  console.log("***************************************")

  menu = true //boolean to control main while loop

  //Error handling - test server
  let test = await getAllRooms() //assign value to test
  
  if(test == undefined) { //if test equals undefined, meaning no value was assigned from the server
    console.log("\nPlease ensure thermostat is on before using app.  Thank you.\n\n") //print warning message
    process.exit(1) //exit application
  }

  //Main while loop
  while(menu) { // while menu equals true
    
    var action = readlineSync.question(
      
      //checks server status and based on response of function
      //uses ternary operator to produce a different message to the user
      //if server is up and working - server status is available and displays menu
      //if server is down - a warning message is printed with menu
      "\nServer status: " + ( await getAllRooms() == undefined ? "Down\nWarning functions may not work correctly\n" 
        + "Please ensure the server is available before continuing."
        : "Available")
      + "\nPlease choose from the menu below:\n"
      + "1 - Connect a new room\n"
      + "2 - Set temperature for a room\n"
      + "3 - Show all rooms\n"
      + "4 - Set temperature for all rooms\n"
      + "5 - Chat\n"
      + "6 - Exit\n"
    )

    //Error handling for user selection
    try {
      action = parseInt(action) //attempt to parse string to an integer
    } catch(err) { //if parse does not convert
      console.error("Please enter a valid choice.") //print error message
      continue //continue from start of while loop, ie. show the menu again
    }


    // User Menu Options /////////////////////////////

    //////////////////////////////////////////////////
    //User selects option 1 - Connecting a room to app
    if (action === 1) {
      //Unary grpc
      //Assign roomName variable using readline sync, question method
      let roomName = readlineSync.question("Connect room name: ") //Receive String input from the user
      //
      try {
        await createRoom(roomName) //call createRoom function using roomName as parameter
        console.log(`${roomName} created successfully`) //success message
      } catch (err) {
          console.error("An error occured in option 1") //error message
      }
    
    ////////////////////////////////////////////////////////
    //User selects option 2 - Setting temperature for a room
    } else if (action === 2) {
      //Unary grpc
      //Error handling in case server is down
      try {
        const rooms = await getAllRooms()
        if(rooms == undefined)
          continue
      } catch(err) {
        console.error('Server down in option 2')
        continue
      }

      //Get a list of all rooms available
      //Assign value to rooms
      const rooms = await getAllRooms()

      //Error handling if there are no elements in room
      if(rooms.length == 0) {
        console.log("No rooms available.")
        continue
      }

      console.log("Set Target Temp for a Room")
      displayRooms(rooms) //call displayRooms method which displays all rooms
      //passing in rooms object


      //both inputs must be numbers
      //room number must be within the rooms size
      let roomNumber //declaration
      let targetTemp 
      
      //Input looop
      while(true) {
        try {
          //assign roomNumber using readlineSync question method from user
          roomNumber = readlineSync.question("Select a room number: ")
          //assign roomNumber using readlineSync question method from user
          targetTemp = readlineSync.question("Select a temperature(5-30) or (-1) turn off thermostat: ")
          //parse both string values as integers
          roomNumber = parseInt(roomNumber)
          targetTemp = parseInt(targetTemp)
          
          //Input Handling
          // if roomNumber is not a number OR if targetTemp is not a number 
          // that is if the parse is not successful
          if(isNaN(roomNumber) || isNaN(targetTemp)) {
            console.log("Please enter valid numbers") //print error message
            continue //let the user try input again
          }
          
          // if roomNumber is less than or equal to 0
          // OR if roomNumber is greater than the number of rooms
          if(roomNumber<=0 || roomNumber>rooms.length) {
            console.log("Please enter a valid room number") //display error message
            displayRooms(rooms) //show list of rooms to the user again
            continue //let the user try input again
          }

          // if targetTemp equals -1
          if(targetTemp == -1)
            break //break the while loop - value is accepted

          // if targetTemp is less than 5 AND targetTemp is greater than 30
          if(targetTemp<5 && targetTemp>30) {
            console.log("Please enter a valid temperature. (5-30) or -1 to turn off.") //display error message
            displayRooms(rooms) //show list of rooms to the user again
            continue //let the user try input again
          }

          break //break while loop if values pass all the input validation
        } catch(err) {
          console.log("Error: ", err) //print error message if error occurs in try block
        }
      }

      //roomName is stored in an array which starts at index 0 - reason for minus 1
      //assign correct roomName
      let roomName = rooms[roomNumber-1].name
      
      //conver values to string to be passed
      roomNumber = roomNumber.toString()
      targetTemp = targetTemp.toString()

      //send data across as strings
      await setTemp(roomName, targetTemp) //call setTemp function, passing in roomName and targetTemp

    ////////////////////////////////////////
    //User selects option 3 - Show all rooms
    } else if (action === 3) {
      //Server Streaming grpc
      console.log("Get List of all Rooms")
      //Get a list of all rooms available
      try {
        const rooms = await getAllRooms()
        if(rooms == undefined)
          continue
      } catch(err) {
        console.error('Server down in option 3')
        continue
      }

      //Checking for 0 rooms available
      const rooms = await getAllRooms()
      if(rooms.length == 0)
        console.log("No rooms connected.")
      displayRooms(rooms)
      
    //////////////////////////////////////////
    //Option 4 - Set temperature for all rooms
    } else if (action === 4) {
      //Client Streaming grpc

      //Error handling in case server is down
      try {
        const rooms = await getAllRooms()
        if(rooms == undefined)
          continue
      } catch(err) {
        console.error('Server down in option 4')
        continue
      }

      console.log("Option 4 - Set Temperature for all Rooms")

      const rooms = await getAllRooms()
      //Error handling
      if(rooms.length == 0) {
        console.log("No rooms connected.")
        continue
      }

      let choice //declare variable for user's choice
      //while loop to accept user input
      while(true) {
        //assign choice to readlineSync question method from user input
        choice = readlineSync.question("Set all rooms the same temperature? y/n ")
        //convert choice to lowercase
        choice = choice.toLowerCase()
        //if choice is either "y" or "n"
        if(choice == "y" || choice == "n") {
          break //valid value and break the while looop
        }
      }

      console.log("Choice is " + choice) //display user's choice

      //switch block for variable choice
      switch(choice) {
        case "y": //send same number repeatedly

          let temp //declare temp variable
          //while loop 
          while(true) {
            try {
              //Assign input from user to temp variable
              temp = readlineSync.question("Set Temp for all rooms: ")
              //Convert temp to integer
              temp = parseInt(temp)
              
              //Input handling
              //If temp is not a number
              if(isNaN(temp)) {
                console.log("Please enter a temperature number.") //print informational message
                continue //short circuit while loop - to gether user input again
              }
              //temp is a number at this point in execution
              //temp is greater or equal to 5 AND temp is less than or equal to 30
              //OR temp is equal to -1
              if((temp >= 5 && temp <=30) || temp == -1)
                break //input is valid - break the while loop

              //if execution reaches this point - it means that the temp number is not valid
              console.log("Please set a temperature between 5 and 30, or -1 to turn off") //print informational message           
            } catch(err) { //if error - print message
              console.error("Please set a temperature between 5 and 30, or -1 to turn off")
            }
          }
          //Convert temp back to string
          temp = String(temp)
          //Call setRoomsSameTemp passing temp and rooms variables
          setRoomsSameTemp(temp, rooms)

          await getAllRooms() //clearing the waiting/blocking
          break //end of case block

        case "n": //case for setting the temperature of each room individually
          //initialise a stream for setting room temperatures using client streaming
          const stream = temperatureClient.setRoomsTempStream((err, response) => {
            //callback function to handle errors
            if (err) // if error
              console.error('Error:', err) //print error message
          })
          //send each room temp individually
          //iterate through each rooms and set each temperature individually
          rooms.forEach(room => {
            while(true) { //while loop used for valid input
              try { //try block to catch errors
                //assign temp value from user using readlineSync question method
                let temp = readlineSync.question(`Room: ${room.name} Current Temp: ${room.currentTemp} Set temp: `)
                let tempNumber = parseInt(temp) //convert to int
                if(!isNaN(tempNumber)) { //validate if tempNumber is a number
                  //set the target temp
                  room.targetTemp = tempNumber
                  const data = { //create object/message to send to server
                    name: room.name, //set name parameter as room.name
                    targetTemp: room.targetTemp //set the targetTemp parameter as room.targetTemp
                  }
                  stream.write(data) //send message as an object using write method
                  break //break from while loop - meaning successful user data input and sending
                }
              } catch(err) { //If error print error
                console.error("Please set a temperature between 5 and 30, or -1 to turn off")
                continue //continue while loop to gather valid input
              }
            }
          })

          stream.end() //end the stream
          //clears blocking for some reason
          await getAllRooms()
          break //end of case block
        default:
          console.log("Unknown choice.")
          break //end of case block
      }

    ///////////////////////////////////////
    // User selects option 5 - chat feature
    } else if (action == 5) {
      //Bidirectional grpc
      //Quotes chat feature
      console.log("Chatbot")
      console.log("Relax and chat with historys greatest minds")
      console.log("Type 'exit' to return to menu\n")
      //Initialise a Bidirectional Streaming rpc to chatService using grpc method chat
      const chatStream = chatClient.chat()

      loop = true //assign loop boolean value true
      try {
        while(loop) //continuously loop while loop is true
          await chatMessage(chatStream)
          chatStream.end() //end the stream
          await getAllRooms() //clears out blocking function
      } catch(err) {
        //console.log(err)
      }

      
      //////////////////////////////
    } else if (action == 6) {
      console.log('Exiting app.')
      console.log('Have pleasant day.')
      menu = false
      break
    } else {
      console.log("Please enter a valid selection.")
    }
  }

}

//Asynchronous function createRoom 
//Unary grpc call
async function createRoom(roomName) { //takes String roomName as parameter
  //initialise a promise to handle asynchronous operations
  return new Promise((resolve, reject) => {
    //call createRoom method from roomService client, passing in roomName as the name message
    client.createRoom({name: roomName}, (err, res) => {
      if(err) reject (err) //if an error occurs reject the promise
      else resolve(res) //else resolve with response
    })
  })
  
}

//Asynchronous funciton chatMessage
//Bidirectional Streaming
async function chatMessage(stream) { //takes a parameter called stream
  //initialise a promise to handle asynchronous operations
  return new Promise((resolve, reject) => {
      let clientMsg = readlineSync.question("Client: ") //assign user input to clientMsg using readlineSync question method
      if(clientMsg == "exit") { //if user types exit - exit the loop
        resolve() //resolve the promise
        loop = false //exit the while loop by setting loop to false
        return //end of function
      }
      try { //try block
        stream.write( { message: clientMsg} ) //send to bidirectional stream - argument is the user input send as a String
      
        stream.once('data', message => { //receive data from bidirectional stream - the data event
          console.log("Server: ", message.message) //on receiving print the data
          resolve() //resolve the promise
        })
      } catch(err) {
        reject(err) //if an error occurs reject promise and pass err 
      }
  })
}

//Asynchronous function getRooms
//Server Streaming grpc call
async function getRooms() {
  //initialise a promise to handle asynchronous operations
  return new Promise((resolve, reject) => {
    const call = client.getRoomsStream() //create grpc call to get rooms stream
    const rooms = [] //initialise array to store rooms

    call.on('data', room => { //listen for data events 
      rooms.push(room) //add room to rooms array on receiving data
    })
  
    call.on('end', () => { //listen for end of server stream event
      resolve(rooms) //resolve promise and return rooms
    })

    call.on('error', err =>{ //list for error event
      reject(err) //reject promise and return error
    })
  })
}


//Asynchronous function getAllRooms
async function getAllRooms() {
  try { //wrap getRooms in try catch block
    const rooms = await getRooms()
    return rooms //return rooms
  } catch (err) { 
      console.error("An error occured in retreiving rooms") //print error message on error
  }
}

//Synchronous function display rooms
function displayRooms(rooms) { //accepts rooms array
  let index = 1 //assign index variable 1
  for(const room of rooms) { //iterate through each room and print details
    console.log(index + " - " + room.name + "  Current Temp: " + room.currentTemp + " C" + " Target Temp: " + (room.targetTemp==-1?"none":room.targetTemp + " C"))
    //dispay index number, current temperature, target temperature depending on if the value is not -1
    index++ //increment index
  }
}

//Asynchronous function setTemp
//Unary grpc call
async function setTemp(roomName, temp) {
  //initialise a promise to handle asynchronous operations
  return new Promise((resolve, reject) => {
    // call the setTempRoom method on temperatureClient, passing roomName and temp
    temperatureClient.setTempRoom({name: roomName.toString(), targetTemp: temp}, (err, res) => {
      //callback function
      if(err) { //if error 
        console.error('Error setting temperature', err) //print error message
        reject(err) //reject promise send error
      } else { //else
        console.log("Temperature set successfully") //print success message
        resolve(res) //resolve promise send response
      }
    })
  })
}

function setRoomsSameTemp(temp, rooms) {

  try {
    const stream = temperatureClient.setRoomsTempStream((err, response) => {
      if (err)
        console.error('Error:', err)
    })
    

    rooms.forEach(room => {
      room.targetTemp = temp
    })
    
    rooms.forEach(room => {
      
      const data = {
        name: room.name,
        targetTemp: room.targetTemp
      }
      //console.log(data)
      stream.write(data)
    })

    stream.end()
    

  } catch(e) {
    console.log(e)
  }

}


main() //call main function

