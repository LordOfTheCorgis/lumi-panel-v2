import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
    faBook,
    faCogs,
    faDatabase,
    faFileAlt,
    faFileArchive,
    faFileAudio,
    faFileCode,
    faFileCsv,
    faFileImage,
    faFileImport,
    faFilePdf,
    faFileVideo,
    faFolder,
    faKey,
} from '@fortawesome/free-solid-svg-icons';
import { FileObject } from '@/api/server/files/loadDirectory';

/**
 * Upstream renders everything as one of three icons (file, archive, symlink),
 * which makes a directory listing hard to scan. Mapping by extension lets you
 * pick out a config or a log at a glance.
 *
 * Colours are deliberately muted; a directory of thirty saturated icons is
 * worse than no colour at all.
 */
interface Presentation {
    icon: IconDefinition;
    color: string;
}

const byExtension: Record<string, Presentation> = {};

const register = (extensions: string[], icon: IconDefinition, color: string) => {
    extensions.forEach((ext) => {
        byExtension[ext] = { icon, color };
    });
};

register(['jar', 'zip', 'gz', 'tar', 'tgz', 'rar', '7z', 'bz2', 'xz', 'zst'], faFileArchive, '#d9a441');
register(['yml', 'yaml', 'toml', 'ini', 'properties', 'conf', 'cfg', 'env', 'config'], faCogs, '#7fd3e0');
register(['json', 'json5', 'xml', 'lock'], faFileCode, '#7fd3e0');
register(
    ['js', 'ts', 'jsx', 'tsx', 'php', 'py', 'rb', 'go', 'rs', 'java', 'kt', 'lua', 'sh', 'bash', 'c', 'cpp', 'h', 'cs'],
    faFileCode,
    '#a3d977'
);
register(['html', 'htm', 'css', 'scss', 'sass', 'vue', 'svelte'], faFileCode, '#ff9d76');
register(['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'ico', 'svg'], faFileImage, '#e0b3ff');
register(['mp3', 'wav', 'ogg', 'flac', 'm4a'], faFileAudio, '#e0b3ff');
register(['mp4', 'mkv', 'webm', 'mov', 'avi'], faFileVideo, '#e0b3ff');
register(['pdf'], faFilePdf, '#ff7676');
register(['csv', 'tsv'], faFileCsv, '#a3d977');
register(['db', 'sqlite', 'sqlite3', 'mca', 'dat', 'mcr', 'nbt'], faDatabase, '#d9a441');
register(['md', 'markdown', 'rst', 'txt', 'log'], faBook, '#8a8a8a');
register(['pem', 'key', 'crt', 'cer', 'pub'], faKey, '#d9a441');

const DEFAULT: Presentation = { icon: faFileAlt, color: '#8a8a8a' };
const DIRECTORY: Presentation = { icon: faFolder, color: '#ff4c4c' };
const SYMLINK: Presentation = { icon: faFileImport, color: '#8a8a8a' };

export default (file: FileObject): Presentation => {
    if (!file.isFile) {
        return DIRECTORY;
    }

    if (file.isSymlink) {
        return SYMLINK;
    }

    const dot = file.name.lastIndexOf('.');
    if (dot < 1) {
        return DEFAULT;
    }

    return byExtension[file.name.slice(dot + 1).toLowerCase()] ?? DEFAULT;
};
