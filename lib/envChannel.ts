import { getAppChannel, type AppChannel } from './env'

export type { AppChannel }
export const appChannel: AppChannel = getAppChannel()
