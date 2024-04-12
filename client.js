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

  try {
    let test = await getAllRooms()
    //console.log(test)
    if(test == undefined) {
      console.log("\nPlease ensure thermostat is on before using app.  Thank you.\n\n")
      process.exit(1)
    }
    while(menu) {
      
      var action = readlineSync.question(
        //If server down - show that message
        
        "\nServer status: " + ( await getAllRooms() == undefined ? "Down" : "Available")
        + "\nPlease choose from the menu below:\n"
        + "1 - Create a new room\n"
        + "2 - Set a temperature for a room\n"
        + "3 - Get all rooms\n"
        + "4 - Set temp of all rooms\n"
        + "5 - Chat\n"
        + "6 - Exit\n"
      )
      //Error handling
      try {
        action = parseInt(action)
      } catch(e) {
        console.log("Please enter a valid choice.")
        continue
      }
      if (action === 1) {
        //Unary grpc call
        let roomName = readlineSync.question("Create new rooom name: ")
        try {
          await createRoom(roomName)
          console.log(`${roomName} created successfully`) //don't even see this message - maybe use promise
        } catch (e) {
            console.log("An error occured in option 1");
        }


      } else if (action === 2) {
        //Set temperature for a room
        //Means you need to get a list of all rooms available
        console.log("Set Target Temp for a Room");
        const rooms = await getAllRooms()
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
            targetTemp = readlineSync.question("Select a temperature(5-30): ")
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
            break
          } catch(e) {
            console.log("Exception", e)
          }
        }
        let roomName = rooms[roomNumber-1].name
        //console.log(roomName)
        roomNumber = roomNumber.toString()
        targetTemp = targetTemp.toString()
        //console.log("Room selected: " + roomName + " target temp:" + targetTemp)
        await setTemp(roomName, targetTemp)
      } else if (action === 3) {
        console.log("Get List of all Rooms");
        //Get a list of all rooms available
        //Do this one first
        const rooms = await getAllRooms()
        displayRooms(rooms)
        

      } else if (action === 4) {
        //Set temperature of all rooms
        //Using client streaming
        console.log("Option 4 - Set Temp of all Rooms");
        const rooms = await getAllRooms()
        const numRooms = rooms.length
        let choice
        while(true) {
          choice = readlineSync.question("Set all rooms the same temperature? y/n ")
          if(choice.toLowerCase() == "y" || choice.toLowerCase() == "n") {
            break;
          }
        }
        console.log("choice is " + choice)

        switch(choice) {
          case "y":
            //send same number repeatedly
            let temp
            while(true) {
              try {
                temp = readlineSync.question("Set Temp for all rooms: ")
                if(temp >= 10 && temp <=30)
                  break
              } catch(e) {
                console.log("Please set a temperature between 10 and 30")
              }
            }
            setRoomsSameTemp(temp, rooms)
            await getAllRooms() //need to figure this out - clearing the waiting
            break

          case "n":
            const stream = client.setRoomsTempStream((err, response) => {
              if (err)
                console.error('Error:', err);
            });
            //send each room temp individually
            //loop through the rooms and set each temperature individually
            rooms.forEach(room => {
              while(true) {
                try {
                  let temp = readlineSync.question(`Room: ${room.name} Set temp: `)
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
        const stream = chatClient.chat()

        loop = true
        while(loop)
          await chatMessage(stream)

        stream.end()
        await getAllRooms() //clears out blocking function
        //////////////////////////////
      } else if (action == 6) {
        menu = false
        break
      } else {
        console.log("Please enter a valid selection.")
      }
    }
  } catch(err) {

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
      stream.write( { message: clientMsg} )
      
      stream.once('data', message => {
        console.log("Server: ", message.message)
        resolve()
      })
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
    
    //console.log(rooms)

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


// main().catch(err => {
//   console.error("An error occurred while running the Smart Thermostat app:", err);
// })