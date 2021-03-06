import path from "path"
import MotorFactory from "./MotorSet/Motor"
import CarFactory from "./Car/Car"
import Encoder from "./MotorSet/Encoder"
import express from "express"
import IO from "socket.io"
import GPIOFactory from "./Hardware/gpio"
import HTTP = require("http")
import { CLIENT_TYPE } from "../types"
import { connectCockpit } from "./ClientHandler/Cockpit"
import { connectRemoteControl } from "./ClientHandler/RemoteControl"
import { connectCamera } from "./ClientHandler/Camera"
import { connectGPIOViewer } from "./ClientHandler/GPIOViewer"

const gpio = GPIOFactory(process.env.NODE_ENV !== "production")

const leftEncoder = Encoder(gpio, 14, 15)
const rightEncoder = Encoder(gpio, 19, 26)
const leftMotorSet = MotorFactory(gpio, 2, 3, 4, leftEncoder)
const rightMotorSet = MotorFactory(gpio, 17, 27, 22, rightEncoder)
const car = CarFactory({ left: leftMotorSet, right: rightMotorSet })

const app = express()
const server = HTTP.createServer(app)
const io = IO(server)
server.listen(10000)
app.use("/", express.static(path.resolve(__dirname, "..", "frontend")))
app.use("/", express.static(path.resolve(__dirname, "..", "pictures")))

function clientHasRegistered(client: IO.Socket, types: string[]): void {
  if (types.includes(CLIENT_TYPE.REMOTE_CONTROL)) {
    connectRemoteControl(client, car)
  }

  if (types.includes(CLIENT_TYPE.CAMERA)) {
    connectCamera(client)
  }

  if (types.includes(CLIENT_TYPE.COCKPIT)) {
    connectCockpit(client, car)
  }

  if (types.includes(CLIENT_TYPE.GPIO_VIEWER)) {
    connectGPIOViewer(client, gpio)
  }
}

console.log(`Car controller is running in "${process.env.NODE_ENV}" mode and waits for connections`)
io.on("connection", (client) => {
  console.log("Client connected")
  client.on("hi", (types) => clientHasRegistered(client, types))
  client.on("disconnect", () => console.log("Client has disconnected"))
  client.emit("hi", "Zerberus")
})

process.on("SIGINT", function () {
  console.log("Caught interrupt signal")
  car.destruct()
  console.log("Motor controller discarded")
  process.exit()
})
