/**
 * Basic test to verify Jest setup is working for frontend
 */
describe('Frontend Jest Setup', () => {
  it('should run basic tests', () => {
    expect(1 + 1).toBe(2);
  });

  it('should have Phaser mock available', () => {
    expect(global.Phaser).toBeDefined();
    expect(global.Phaser.Scene).toBeDefined();
    expect(global.Phaser.Game).toBeDefined();
  });

  it('should have canvas mock available', () => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    expect(context).toBeTruthy();
    expect(context?.fillRect).toBeDefined();
  });

  it('should support async tests', async () => {
    const result = await Promise.resolve('test');
    expect(result).toBe('test');
  });
});