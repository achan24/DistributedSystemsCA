const grpc = require('@grpc/grpc-js');
const path = require('path');
const protoLoader = require('@grpc/proto-loader');

const PROTO_PATH = path.join(__dirname, 'thermostat.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH);

const thermostatProto = grpc.loadPackageDefinition(packageDefinition);
const readlineSync = require('readline-sync');

const http = require('http');
const axios = require('axios');

// create a client instance
const client = new thermostatProto.thermostatPackage.RoomService (
  "localhost:50051",
  grpc.credentials.createInsecure()
)

// main function and menu
async function main() {
  console.log("\n***************************************")
  console.log("  Welcome to the Smart Thermostat app  ")
  console.log("***************************************\n")


  menu = true

  while(menu) {
    var action = readlineSync.question(
      "Please choose from the menu below:\n"
      + "1 - Create a new room\n"
      + "2 - Set a temperature for a room\n"
      + "3 - Get all rooms\n"
      + "4 - Set temp of all rooms\n"
      + "5 - Chat echo feature\n"
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
        console.log(`${roomName} created successfully`)
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
          targetTemp = readlineSync.question("Select a temperature: ")
          //then call the function to change the target temp for a room
          roomNumber = parseInt(roomNumber)
          targetTemp = parseInt(targetTemp)
          
          if(isNaN(roomNumber) || isNaN(targetTemp)) {
            console.log("Please enter valid numbers")
            continue
          }

          break
        } catch(e) {
          console.log("Exception")
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
      console.log("Option 4");
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
          setRoomsSameTemp(20, rooms)
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
                  //console.log(data)
                  stream.write(data)
                  break
                }
              } catch(e) {
                console.log(e)
                continue
              }

            }
          })

          stream.end();
          break
        default:
          break
      }

    } else if (action == 6) {
      menu = false
      break;
    } else {
      console.log("Error:Operationnotrecognized")
    }
  }
}

async function createRoom(roomName) {
  client.createRoom({name: roomName}, (err, res) => {
    if(err) throw err
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
  } catch (e) {
      console.log("An error occured in retreiving rooms");
  }
}

function displayRooms(rooms) {
  let index = 1
  for(const room of rooms) {
    console.log(index + " - " + room.name + "  Current Temp: " + room.currentTemp + " C" + " Target Temp: " + (room.targetTemp==undefined?"none":room.targetTemp + " C"))
    index++
  }
}

async function setTemp(roomName, temp) {
  return new Promise((resolve, reject) => {
    //console.log("sending roomname " + roomName + " temp: " + temp)
    client.setTempRoom({name: roomName.toString(), targetTemp: temp}, (err, res) => {
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

    const stream = client.setRoomsTempStream((err, response) => {
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

const app = express();

async function getBestAnagram(letters) {
  try {
    const response = await axios.get(`http://www.anagramica.com/best/${letters}`);
    console.log("Trying to get api")
    return response.data;
  } catch (error) {
    console.log('Problem fetching api data.');
  }
}

// Define a route for retrieving the best anagram
app.get('/best/:letters', async (req, res) => {
  const { letters } = req.params;
  try {
    const result = await getBestAnagram(letters);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

(async () => {
  try {
    const letters = 'listen';
    const result = await getBestAnagram(letters);
    console.log('Best anagram:', result);
  } catch (error) {
    console.error(error.message);
  }
})();



main()
