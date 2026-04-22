import type { ISessionService } from '@/lib/services/contracts/session-service'
import { SimulatedSessionService } from '@/lib/services/providers/share-380-simulated/session-service'

class ElectronSessionService extends SimulatedSessionService implements ISessionService {}

let electronSessionService: ISessionService | null = null

export function getElectronSessionService(): ISessionService {
  if (!electronSessionService) {
    electronSessionService = new ElectronSessionService()
  }

  return electronSessionService
}