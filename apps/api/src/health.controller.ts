import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  private readonly instanceId = process.env.INSTANCE_ID || process.env.HOSTNAME || 'unknown';

  @Get()
  health() {
    return { ok: true, instance: this.instanceId, ts: new Date().toISOString() };
  }
}
