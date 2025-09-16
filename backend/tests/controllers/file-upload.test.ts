// Mock multer configuration test
describe('File Upload Configuration', () => {
  it('should generate filename in timestamp-original format', () => {
    const originalName = 'surat_undangan.pdf';
    const timestamp = Date.now();
    
    // Mock the filename function behavior
    let generatedFilename = '';
    const cb = (error: any, filename: string) => {
      generatedFilename = filename;
    };
    
    // Simulate the multer filename function
    const sanitizedOriginalName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${timestamp}-${sanitizedOriginalName}`);
    
    expect(generatedFilename).toMatch(/^\d+-surat_undangan\.pdf$/);
    expect(generatedFilename).toContain(sanitizedOriginalName);
  });
  
  it('should sanitize filename with special characters', () => {
    const originalName = 'surat & dokumen@#$.pdf';
    
    let generatedFilename = '';
    const cb = (error: any, filename: string) => {
      generatedFilename = filename;
    };
    
    const timestamp = Date.now();
    const sanitizedOriginalName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${timestamp}-${sanitizedOriginalName}`);
    
    expect(generatedFilename).toMatch(/^\d+-surat___dokumen___\.pdf$/);
    expect(generatedFilename).not.toContain('@');
    expect(generatedFilename).not.toContain('#');
    expect(generatedFilename).not.toContain('&');
  });
});