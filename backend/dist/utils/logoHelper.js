"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCompanyLogoPath = getCompanyLogoPath;
exports.getCompanyLogoBuffer = getCompanyLogoBuffer;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
/**
 * Resolves the absolute path to the company logo on disk across different environments.
 */
function getCompanyLogoPath() {
    const candidatePaths = [
        // 1. Direct relative to this file (__dirname points to backend/src/utils or backend/dist/utils)
        path_1.default.resolve(__dirname, '../../assets/falcon_logo.png'),
        path_1.default.resolve(__dirname, '../../assets/logo.png'),
        path_1.default.resolve(__dirname, '../assets/falcon_logo.png'),
        path_1.default.resolve(__dirname, '../assets/logo.png'),
        // 2. Relative to project workspace root or backend root
        path_1.default.resolve(process.cwd(), 'backend/assets/falcon_logo.png'),
        path_1.default.resolve(process.cwd(), 'backend/assets/logo.png'),
        path_1.default.resolve(process.cwd(), 'assets/falcon_logo.png'),
        path_1.default.resolve(process.cwd(), 'assets/logo.png'),
        // 3. Admin public directory
        path_1.default.resolve(process.cwd(), 'admin/public/falcon_logo.png'),
        path_1.default.resolve(process.cwd(), 'admin/public/logo.png'),
        // 4. Mobile assets directory
        path_1.default.resolve(process.cwd(), 'mobile/assets/logo.png'),
    ];
    for (const p of candidatePaths) {
        if (fs_1.default.existsSync(p)) {
            return p;
        }
    }
    return null;
}
/**
 * Returns the company logo image Buffer, or null if not found.
 */
function getCompanyLogoBuffer() {
    const logoPath = getCompanyLogoPath();
    if (logoPath) {
        try {
            return fs_1.default.readFileSync(logoPath);
        }
        catch (err) {
            console.warn('Failed to read company logo buffer from:', logoPath, err);
        }
    }
    return null;
}
