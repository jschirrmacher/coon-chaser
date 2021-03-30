import 'should'
import MotorFactory, { getAdaptedThrottle, Motor, MotorMode, MAX_ACCELERATION } from './MotorSet'
import GPIOFactory, { GPIO, INPUT, OUTPUT, PWM } from './gpio'
import EncoderFactory from './Encoder'

const logger = {
  messages: [],
  debug: (msg: string) => {
    logger.messages.push(msg)
  },
  warn: () => {
    //
  },
  info: () => {
    //
  }
}

describe('MotorSet', () => {
  let motor: Motor
  let gpio: GPIO

  beforeEach(() => {
    gpio = GPIOFactory(true)
    motor = MotorFactory(gpio, 1, 2, 3, EncoderFactory(gpio, 4, 5), logger)
  })

  afterEach(() => {
    motor.destruct()
  })

  it('should initialize the GPIO', () => {
    gpio.initializedPins.should.deepEqual({
      1: { mode: OUTPUT },
      2: { mode: OUTPUT },
      3: { mode: PWM },
      4: { mode: INPUT },
      5: { mode: INPUT },
    })
  })

  it('should have an id', () => {
    const motor2 = MotorFactory(gpio, 6, 7, 8)
    const no2 = motor2.no
    no2.should.not.equal(motor.no)
  })

  it('should be in FORWARD mode after being accelerated', async () => {
    await motor.accelerate(100).promise
    motor.mode.should.equal(MotorMode.FORWARD)
  })

  it('should be in BACKWARDS mode after being accelerated with negative speed', async () => {
    await motor.accelerate(-100).promise
    motor.mode.should.equal(MotorMode.BACKWARDS)
  })

  it('should go to FLOAT mode when decelerated to 0', async () => {
    await motor.accelerate(10).promise
    await motor.accelerate(0).promise
    motor.mode.should.equal(MotorMode.FLOAT)
  })

  it('should reflect the throttle', async () => {
    await motor.accelerate(42).promise
    motor.throttle.should.equal(42)
  })

  it('should not allow to accelerate to more than 100%', async () => {
    await motor.accelerate(101).promise
    motor.throttle.should.equal(100)
    await motor.accelerate(-101).promise
    motor.throttle.should.equal(-100)
  })

  it('should adapt throttle slowly', () => {
    getAdaptedThrottle(100, 0).should.equal(MAX_ACCELERATION)
    getAdaptedThrottle(100, 80).should.equal(100)
    getAdaptedThrottle(-100, 80).should.equal(80 - MAX_ACCELERATION)
  })
  
  it('should accelerate with a maximum acceleration', async () => {
    logger.messages.length = 0
    await motor.accelerate(100).promise
    logger.messages.map(e => e.split(',')[3]).should.deepEqual([ '40', '80', '100' ])
  })

  it('should go to FLOAT mode when calling float()', async () => {
    await motor.accelerate(100).promise
    await motor.float().promise
    motor.mode.should.equal(MotorMode.FLOAT)
  })

  it('should allow to wait for a position to be reached', async () => {
    const trigger = motor.positionReached(10)
    motor.accelerate(100)
    await trigger.promise
    motor.getPosition().should.be.greaterThanOrEqual(10)
  })

  it('should allow to wait for a negative position to be reached', async () => {
    const trigger = motor.positionReached(-10)
    motor.accelerate(-100)
    await trigger.promise
    motor.getPosition().should.be.lessThanOrEqual(10)
  })

  it('should allow to be notified when a speed is reached', async () => {
    const trigger = motor.speedReached(50)
    motor.accelerate(100)
    await trigger.promise
    motor.getSpeed().should.be.greaterThanOrEqual(50)
  })

  it('should allow to run the motor a given distance', async () => {
    await motor.go(100, 100).promise
    motor.getPosition().should.be.greaterThanOrEqual(100)
  })

  // @todo Add tests for blocking functions
})
