import { NextFunction, Request, Response, Router } from "express"
import { Server } from "socket.io"

const gpioPins = {
  SDA: 3,
  2: 3,
  SCL: 5,
  3: 5,
  GPCLK0: 7,
  4: 7,
  TXD: 8,
  14: 8,
  RXD: 10,
  15: 10,
  17: 11,
  18: 12,
  27: 13,
  22: 15,
  23: 16,
  24: 18,
  MOSI: 19,
  10: 19,
  MISO: 21,
  9: 21,
  25: 22,
  SCLK: 23,
  11: 23,
  CE0: 24,
  8: 24,
  CE1: 26,
  7: 26,
  ID_SD: 27,
  ID_SC: 28,
  5: 29,
  6: 31,
  12: 32,
  13: 33,
  19: 35,
  16: 36,
  26: 37,
  20: 38,
  21: 40
}

const gpioModes = ['IN', 'OUT', 'PWM']

export default function (io: Server) {
  const router = Router()

  function jsonResult(func: (req: Request) => void) {
    return function (req: Request, res: Response, next: NextFunction) {
      try {
        const result = func(req)
        res.json(result)
      } catch (error) {
        next(error)
      }
    }
  }

  function assertKnownPin(pinFromRequest: string): number {
    const pin = gpioPins[pinFromRequest]
    if (!pin) {
      throw { httpStatus: 400, error: 'Unknown GPIO pin' }
    }
    return pin
  }

  router.post('/gpio/mode/:pin/:value', jsonResult((req: Request) => {
    const pin = assertKnownPin(req.params.pin)
    if (!gpioModes.includes(req.params.value)) {
      throw { httpStatus: 400, error: 'Unknown GPIO mode' }
    }
    io.emit('gpio-mode', { pin, mode: req.params.value })
    return { ok: true }
  }))

  router.post('/gpio/:pin/:value', jsonResult((req: Request) => {
    const pin = assertKnownPin(req.params.pin)
    const value = !!+req.params.value
    io.emit('gpio-write', { pin, value })
    return { ok: true }
  }))

  router.get('/gpio/:pin', jsonResult((req: Request) => {

  }))

  router.post('/gpio/pwm/:pin/:value', jsonResult((req: Request) => {
    const pin = assertKnownPin(req.params.pin)
    const value = Math.min(255, Math.max(0, +req.params.value))
    io.emit('gpio-pwm', { pin, value })
    return { ok: true }
  }))

  return router
}