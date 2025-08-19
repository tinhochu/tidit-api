import pino from 'pino'

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      ignore: 'pid,hostname',
    },
  },
  level: process.env.PINO_LOG_LEVEL || 'info',
})

export default logger
