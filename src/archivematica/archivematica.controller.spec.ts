import { Test, TestingModule } from '@nestjs/testing';
import { ArchivematicaController } from './archivematica.controller';

describe('ArchivematicaController', () => {
  let controller: ArchivematicaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ArchivematicaController],
    }).compile();

    controller = module.get<ArchivematicaController>(ArchivematicaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
