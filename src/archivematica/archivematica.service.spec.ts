import { Test, TestingModule } from '@nestjs/testing';
import { ArchivematicaService } from './archivematica.service';

describe('ArchivematicaService', () => {
  let service: ArchivematicaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ArchivematicaService],
    }).compile();

    service = module.get<ArchivematicaService>(ArchivematicaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
