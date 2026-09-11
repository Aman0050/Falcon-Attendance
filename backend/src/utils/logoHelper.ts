import path from 'path';
import fs from 'fs';

/**
 * Resolves the absolute path to the company logo on disk across different environments.
 */
export function getCompanyLogoPath(): string | null {
  const candidatePaths = [
    // 1. Direct relative to this file (__dirname points to backend/src/utils or backend/dist/utils)
    path.resolve(__dirname, '../../assets/falcon_logo.png'),
    path.resolve(__dirname, '../../assets/logo.png'),
    path.resolve(__dirname, '../assets/falcon_logo.png'),
    path.resolve(__dirname, '../assets/logo.png'),
    // 2. Relative to project workspace root or backend root
    path.resolve(process.cwd(), 'backend/assets/falcon_logo.png'),
    path.resolve(process.cwd(), 'backend/assets/logo.png'),
    path.resolve(process.cwd(), 'assets/falcon_logo.png'),
    path.resolve(process.cwd(), 'assets/logo.png'),
    // 3. Admin public directory
    path.resolve(process.cwd(), 'admin/public/falcon_logo.png'),
    path.resolve(process.cwd(), 'admin/public/logo.png'),
    // 4. Mobile assets directory
    path.resolve(process.cwd(), 'mobile/assets/logo.png'),
  ];

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  return null;
}

/**
 * Returns the company logo image Buffer, or null if not found.
 */
export function getCompanyLogoBuffer(): Buffer | null {
  const logoPath = getCompanyLogoPath();
  if (logoPath) {
    try {
      return fs.readFileSync(logoPath);
    } catch (err) {
      console.warn('Failed to read company logo buffer from:', logoPath, err);
    }
  }
  return null;
}
