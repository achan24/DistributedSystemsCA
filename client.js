const grpc = require('@grpc/grpc-js');
const path = require('path');
const protoLoader = require('@grpc/proto-loader');

const PROTO_PATH = path.join(__dirname, 'thermostat.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH);

const thermostatProto = grpc.loadPackageDefinition(packageDefinition);
const readlineSync = require('readline-sync');


// create a client instance
const client = new thermostatProto.thermostatPackage.RoomService (
  "localhost:50051",
  grpc.credentials.createInsecure()
)

const temperatureClient = new thermostatProto.thermostatPackage.TemperatureService(
  "localhost:50051",
  grpc.credentials.createInsecure()
)

const chatClient = new thermostatProto.thermostatPackage.ChatService(
  "localhost:50051",
  grpc.credentials.createInsecure()
)


// main function and menu
async function main() {
  console.log("\n***************************************")
  console.log("  Welcome to the Smart Thermostat app  ")
  console.log("***************************************")


  menu = true

  
  let test = await getAllRooms()
  
  if(test == undefined) {
    console.log("\nPlease ensure thermostat is on before using app.  Thank you.\n\n")
    process.exit(1)
  }

  while(menu) {
    
    var action = readlineSync.question(
      //If server down - show that message
      
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
      action = parseInt(action)
    } catch(e) {
      console.log("Please enter a valid choice.")
      continue
    }
    if (action === 1) {
      //Unary grpc call
      let roomName = readlineSync.question("Connect room name: ")
      try {
        await createRoom(roomName)
        console.log(`${roomName} created successfully`) //don't even see this message - maybe use promise
      } catch (e) {
          console.log("An error occured in option 1");
      }


    } else if (action === 2) {
      //Set temperature for a room
      //Error handling in case server is down
      try {
        await getAllRooms()
      } catch(err) {
        continue
      }

      //Get a list of all rooms available
      const rooms = await getAllRooms()
      if(rooms.length == 0) {
        console.log("No rooms available.")
        continue
      }
      console.log("Set Target Temp for a Room");
      displayRooms(rooms)

      //both inputs must be numbers
      //room number must be within the rooms size
      let roomNumber 
      let targetTemp 
      while(true) {
        try {
          roomNumber = readlineSync.question("Select a room number: ")
          //now I want to edit a room
          //the number is going to be numnber - 1
          //get the name
          //send it back to the server
          targetTemp = readlineSync.question("Select a temperature(5-30) or (-1) turn off thermostat: ")
          //then call the function to change the target temp for a room
          roomNumber = parseInt(roomNumber)
          targetTemp = parseInt(targetTemp)
          
          if(isNaN(roomNumber) || isNaN(targetTemp)) {
            console.log("Please enter valid numbers")
            continue
          }
          //input handling
          if(roomNumber<=0 || roomNumber>rooms.length) {
            console.log("Please enter a valid room number")
            displayRooms(rooms)
            continue
          }
          if(targetTemp == -1)
            break
          if(targetTemp<5 && targetTemp>30) {
            console.log("Please enter a valid temperature. (5-30) or -1 to turn off.")
            displayRooms(rooms)
            continue
          }
          break
        } catch(err) {
          console.log("Error: ", err)
        }
      }
      //roomName is stored in an array which starts at index 0 - reason for minus 1
      let roomName = rooms[roomNumber-1].name
    
      roomNumber = roomNumber.toString()
      targetTemp = targetTemp.toString()
      //console.log("Room selected: " + roomName + " target temp:" + targetTemp)
      //send data across as strings
      await setTemp(roomName, targetTemp)

    } else if (action === 3) {
      console.log("Get List of all Rooms");
      //Get a list of all rooms available
      //Do this one first
      try{
        await getAllRooms()
      } catch(err) {
        continue
      }
      const rooms = await getAllRooms()
      if(rooms.length == 0)
        console.log("No rooms connected.")
      displayRooms(rooms)
      

    } else if (action === 4) {
      //Set temperature of all rooms
      //Using client streaming

      //Error handling in case server is down
      try {
        await getAllRooms()
      } catch(err) {
        continue
      }
      console.log("Option 4 - Set Temperature for all Rooms");

      const rooms = await getAllRooms()
      //Error handling
      if(rooms.length == 0) {
        console.log("No rooms connected.")
        continue
      }
      let choice
      while(true) {
        choice = readlineSync.question("Set all rooms the same temperature? y/n ")
        if(choice.toLowerCase() == "y" || choice.toLowerCase() == "n") {
          break
        }
      }
      console.log("Choice is " + choice)

      switch(choice) {
        case "y":
          //send same number repeatedly
          let temp
          while(true) {
            try {
              temp = readlineSync.question("Set Temp for all rooms: ")
              if((temp >= 5 && temp <=30) || temp == -1)
                break
            } catch(e) {
              console.log("Please set a temperature between 5 and 30")
            }
          }
          setRoomsSameTemp(temp, rooms)
          await getAllRooms() //need to figure this out - clearing the waiting
          break

        case "n":
          const stream = temperatureClient.setRoomsTempStream((err, response) => {
            if (err)
              console.error('Error:', err);
          });
          //send each room temp individually
          //loop through the rooms and set each temperature individually
          rooms.forEach(room => {
            while(true) {
              try {
                let temp = readlineSync.question(`Room: ${room.name} Current Temp: ${room.currentTemp} Set temp: `)
                let tempNumber = parseInt(temp)
                if(!isNaN(tempNumber)) {
                  //set the target temp
                  room.targetTemp = tempNumber
                  const data = {
                    name: room.name,
                    targetTemp: room.targetTemp
                  }
                  stream.write(data)
                  break
                }
              } catch(e) {
                console.log(e)
                continue
              }
            }
          })

          stream.end()
          //clears blocking for some reason
          await getAllRooms()
          break
        default:
          break
      }
    } else if (action == 5) {
      //Bidirectional rpc
      //Quotes chat feature
      console.log("Chatbot")
      console.log("Relax and chat with historys greatest minds")
      console.log("Type 'exit' to return to menu\n")
      const chatStream = chatClient.chat()

      loop = true
      try {
        while(loop)
          await chatMessage(chatStream)
          chatStream.end()
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


async function createRoom(roomName) {
  return new Promise((resolve, reject) => {
    client.createRoom({name: roomName}, (err, res) => {
      if(err) reject (err)
      else resolve(res)
    })
  })
  
}

async function chatMessage(stream) {
  return new Promise((resolve, reject) => {
      let clientMsg = readlineSync.question("Client: ")
      if(clientMsg == "exit") {
        resolve()
        loop = false
        return
      }
      try {
        stream.write( { message: clientMsg} )
      
        stream.once('data', message => {
          console.log("Server: ", message.message)
          resolve()
        })
      } catch(err) {
        //console.error("Error occurred while sending message:", err.message);
        //reject(err)
      }

  })
}

//Server streaming grpc call
async function getRooms() {
  return new Promise((resolve, reject) => {
    const call = client.getRoomsStream()
    const rooms = []
    call.on('data', room => {
      rooms.push(room)
    })
  
    call.on('end', () => {
      resolve(rooms)
    })

    call.on('error', err =>{
      reject(err)
    })
  })

}

async function getAllRooms() {
  try {
    const rooms = await getRooms()
    return rooms
  } catch (err) {
      console.log("An error occured in retreiving rooms");
  }
}

function displayRooms(rooms) {
  let index = 1
  for(const room of rooms) {
    console.log(index + " - " + room.name + "  Current Temp: " + room.currentTemp + " C" + " Target Temp: " + (room.targetTemp==-1?"none":room.targetTemp + " C"))
    index++
  }
}

async function setTemp(roomName, temp) {
  return new Promise((resolve, reject) => {

    temperatureClient.setTempRoom({name: roomName.toString(), targetTemp: temp}, (err, res) => {
      if(err) {
        console.error('Error setting temperature', err)
        reject(err)
      } else {
        console.log("Temperature set successfully")
        resolve(res)
      }
    })
  })
}

function setRoomsSameTemp(temp, rooms) {

  try {
    const stream = temperatureClient.setRoomsTempStream((err, response) => {
      if (err)
        console.error('Error:', err);
    });
    

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

    stream.end();
    

  } catch(e) {
    console.log(e)
  }

}


main()

