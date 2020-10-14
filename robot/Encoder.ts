const Gpio = require('../gpio')

export type Trigger = {
  promise: Promise<void>,
  cancel: () => void,
}

type Listener = (pos: number, speed: number) => boolean

export type Encoder = {
  no: number,
  simulated: boolean,
  currentPosition: number,
  currentSpeed: number,
  tick(diff: number, time: number): void,
  position(desiredPosition: number): Trigger,
  speed(desiredSpeed: number): Trigger,
}

let encoderNo = 1

const QEM = [
  [0, -1, 1, NaN],
  [1, 0, NaN, -1],
  [-1, NaN, 0, 1],
  [NaN, 1, -1, 0],
]

/*
  This class implements a quadrature encoder with two outputs, with a 90° phase shift.
  Specify the GPIO pins where the outputs are connecte too.
*/
export default function (pin_a: number, pin_b: number): Encoder {
  let oldVal = 0
  let lastTick = undefined as number
  const stream = new Gpio.Notifier({ bits: 1 << pin_a | 1 << pin_b })
  let listeners = {} as Record<number, Listener>
  let listenerId = 0

  function addListener(func: Listener): Trigger {
    const id = ++listenerId
    return {
      promise: new Promise(resolve => {
        listeners[id] = (pos: number, speed: number) => {
          const condition = func(pos, speed)
          if (condition) {
            console.debug(`Encoder #${encoder.no} triggered`)
            delete listeners[id]
            resolve()
          }
          return condition
        }
      }),
      cancel: () => delete listeners[id]
    }
  }
  
  const encoder = {
    no: encoderNo++,
    simulated: stream.simulated,
    currentPosition: 0,
    currentSpeed: undefined as number,

    /*
      Handle a single tick of the motor.
      `diff` should specify the direction, +1 is forward, -1 is backwards.
      `time` is specified in microseconds.
    */
    tick(diff: number, time: number): void {
      encoder.currentPosition += diff
      encoder.currentSpeed = lastTick ? diff / (time - lastTick) : undefined
      console.debug(`Encoder #${encoder.no}: pos=${encoder.currentPosition}, spd=${encoder.currentSpeed}, time=${time}, lastTick=${lastTick}`)
      lastTick = time
      Object.values(listeners).forEach(listener => listener(encoder.currentPosition, encoder.currentSpeed))
    },

    /*
      Returns a trigger that waits for a position to be reached.
    */
    position(desiredPosition: number): Trigger {
      console.debug(`Encoder #${encoder.no}: setting trigger to position=${desiredPosition}`)
      const direction = Math.sign(desiredPosition - encoder.currentPosition)
      return addListener((pos: number, speed: number) => direction > 0 && pos >= desiredPosition || direction < 0 && pos <= desiredPosition)
    },

    speed(desiredSpeed: number): Trigger {
      console.debug(`Encoder #${encoder.no}: setting trigger to speed=${desiredSpeed}`)
      const direction = Math.sign(desiredSpeed - encoder.currentSpeed)
      return addListener((pos: number, speed: number) => direction > 0 && speed >= desiredSpeed || direction < 0 && speed <= desiredSpeed)
    }
  }

  function handleChunk(chunk: Buffer) {
    if (!(chunk.readUInt16LE(2) & Gpio.Notifier.PI_NTFY_FLAGS_ALIVE)) {
      const level = chunk.readUInt32LE(8)
      const newVal = ((level >>> pin_a) & 1) << 1 | ((level >>> pin_b) & 1)
      const diff = QEM[oldVal][newVal]
      if (!Number.isNaN(diff) && diff !== 0) {
        encoder.tick(diff, chunk.readUInt32LE(4))
      }
      oldVal = newVal
    }

    chunk.length > 12 && handleChunk(chunk.slice(12))
  }

  new Gpio(pin_a, { mode: Gpio.INPUT })
  new Gpio(pin_b, { mode: Gpio.INPUT })
  stream.stream().on('data', handleChunk)

  return encoder
}
