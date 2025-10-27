import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class FileStorageService {
  private readonly logger = new Logger(FileStorageService.name);

  async uploadFile(fileBuffer: Buffer, fileName: string): Promise<{ fileId: string; url: string }> {
    this.logger.verbose(`Simulating file upload for ${fileName} (${fileBuffer.byteLength} bytes)`);

    const fakeFileId = `fake-file-${Date.now()}`;
    const fakeUrl = `https://storage.example.com/${fakeFileId}`;

    return {
      fileId: fakeFileId,
      url: fakeUrl,
    };
  }

  async getFileUrl(fileId: string): Promise<string> {
    this.logger.verbose(`Simulating retrieval of file URL for ${fileId}`);

    return `https://storage.example.com/${fileId}`;
  }
}
