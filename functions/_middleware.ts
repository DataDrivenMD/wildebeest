import { logger } from 'wildebeest/backend/src/middleware/logger'
import { errorHandling } from 'wildebeest/backend/src/middleware/error'

export const onRequest = [logger, errorHandling]
export const onRequestGet = [logger, errorHandling]
export const onRequestPost = [logger, errorHandling]
export const onRequestDelete = [logger, errorHandling]
export const onRequestPut = [logger, errorHandling]
