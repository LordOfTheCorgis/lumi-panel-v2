import { Extension } from '@codemirror/state';
import { LanguageSupport, StreamLanguage, StreamParser } from '@codemirror/language';

/**
 * Maps the MIME types declared in `@/modes` onto CodeMirror 6 grammars.
 *
 * Every entry is a dynamic import so webpack splits each grammar into its own
 * chunk. Opening a YAML file pulls the YAML parser and nothing else, which is
 * what keeps the editor bundle small despite the breadth of languages here.
 */
type LanguageLoader = () => Promise<Extension>;

const stream = <T>(parser: StreamParser<T>): Extension => StreamLanguage.define(parser);

// Grammars that ship as a proper Lezer parser.
const sql = async (dialect: 'StandardSQL' | 'MySQL' | 'MariaSQL' | 'MSSQL' | 'PostgreSQL' | 'SQLite' | 'Cassandra') => {
    const mod = await import(/* webpackChunkName: "cm-sql" */ '@codemirror/lang-sql');

    return mod.sql({ dialect: mod[dialect] });
};

const legacy = async <T>(load: Promise<StreamParser<T>>): Promise<Extension> => stream(await load);

const languages: Record<string, LanguageLoader> = {
    // C and C++ share the one Lezer grammar; it handles plain C acceptably.
    'text/x-csrc': () => import(/* webpackChunkName: "cm-cpp" */ '@codemirror/lang-cpp').then((m) => m.cpp()),
    'text/x-c++src': () => import(/* webpackChunkName: "cm-cpp" */ '@codemirror/lang-cpp').then((m) => m.cpp()),
    'text/x-csharp': () =>
        legacy(import(/* webpackChunkName: "cm-clike" */ '@codemirror/legacy-modes/mode/clike').then((m) => m.csharp)),
    'text/css': () => import(/* webpackChunkName: "cm-css" */ '@codemirror/lang-css').then((m) => m.css()),
    'text/x-cassandra': () => sql('Cassandra'),
    'text/x-diff': () =>
        legacy(import(/* webpackChunkName: "cm-diff" */ '@codemirror/legacy-modes/mode/diff').then((m) => m.diff)),
    'text/x-dockerfile': () =>
        legacy(
            import(/* webpackChunkName: "cm-docker" */ '@codemirror/legacy-modes/mode/dockerfile').then(
                (m) => m.dockerFile
            )
        ),
    'text/x-gfm': () =>
        import(/* webpackChunkName: "cm-markdown" */ '@codemirror/lang-markdown').then((m) => m.markdown()),
    'text/x-go': () => import(/* webpackChunkName: "cm-go" */ '@codemirror/lang-go').then((m) => m.go()),
    'text/html': () => import(/* webpackChunkName: "cm-html" */ '@codemirror/lang-html').then((m) => m.html()),
    'message/http': () =>
        legacy(import(/* webpackChunkName: "cm-http" */ '@codemirror/legacy-modes/mode/http').then((m) => m.http)),
    'text/javascript': () =>
        import(/* webpackChunkName: "cm-javascript" */ '@codemirror/lang-javascript').then((m) => m.javascript()),
    'application/json': () => import(/* webpackChunkName: "cm-json" */ '@codemirror/lang-json').then((m) => m.json()),
    'text/x-lua': () =>
        legacy(import(/* webpackChunkName: "cm-lua" */ '@codemirror/legacy-modes/mode/lua').then((m) => m.lua)),
    'text/x-markdown': () =>
        import(/* webpackChunkName: "cm-markdown" */ '@codemirror/lang-markdown').then((m) => m.markdown()),
    'text/x-mariadb': () => sql('MariaSQL'),
    'text/x-mssql': () => sql('MSSQL'),
    'text/x-mysql': () => sql('MySQL'),
    'text/x-nginx-conf': () =>
        legacy(import(/* webpackChunkName: "cm-nginx" */ '@codemirror/legacy-modes/mode/nginx').then((m) => m.nginx)),
    'text/x-php': () => import(/* webpackChunkName: "cm-php" */ '@codemirror/lang-php').then((m) => m.php()),
    'text/plain': () => Promise.resolve([]),
    'text/x-pgsql': () => sql('PostgreSQL'),
    'text/x-properties': () =>
        legacy(
            import(/* webpackChunkName: "cm-properties" */ '@codemirror/legacy-modes/mode/properties').then(
                (m) => m.properties
            )
        ),
    'text/x-pug': () =>
        legacy(import(/* webpackChunkName: "cm-pug" */ '@codemirror/legacy-modes/mode/pug').then((m) => m.pug)),
    'text/x-python': () =>
        import(/* webpackChunkName: "cm-python" */ '@codemirror/lang-python').then((m) => m.python()),
    'text/x-ruby': () =>
        legacy(import(/* webpackChunkName: "cm-ruby" */ '@codemirror/legacy-modes/mode/ruby').then((m) => m.ruby)),
    'text/x-rustsrc': () => import(/* webpackChunkName: "cm-rust" */ '@codemirror/lang-rust').then((m) => m.rust()),
    'text/x-sass': () =>
        import(/* webpackChunkName: "cm-sass" */ '@codemirror/lang-sass').then((m) => m.sass({ indented: true })),
    'text/x-scss': () =>
        import(/* webpackChunkName: "cm-sass" */ '@codemirror/lang-sass').then((m) => m.sass({ indented: false })),
    'text/x-sh': () =>
        legacy(import(/* webpackChunkName: "cm-shell" */ '@codemirror/legacy-modes/mode/shell').then((m) => m.shell)),
    'text/x-sql': () => sql('StandardSQL'),
    'text/x-sqlite': () => sql('SQLite'),
    'text/x-toml': () =>
        legacy(import(/* webpackChunkName: "cm-toml" */ '@codemirror/legacy-modes/mode/toml').then((m) => m.toml)),
    'application/typescript': () =>
        import(/* webpackChunkName: "cm-javascript" */ '@codemirror/lang-javascript').then((m) =>
            m.javascript({ typescript: true })
        ),
    'script/x-vue': () => import(/* webpackChunkName: "cm-vue" */ '@codemirror/lang-vue').then((m) => m.vue()),
    'application/xml': () => import(/* webpackChunkName: "cm-xml" */ '@codemirror/lang-xml').then((m) => m.xml()),
    'text/x-yaml': () => import(/* webpackChunkName: "cm-yaml" */ '@codemirror/lang-yaml').then((m) => m.yaml()),
};

/**
 * Resolves a MIME type to a CodeMirror extension. Unknown types fall back to no
 * highlighting rather than throwing, so an unmapped mode still opens the file.
 */
export const loadLanguage = async (mime: string): Promise<Extension> => {
    const loader = languages[mime];

    if (!loader) {
        return [];
    }

    try {
        return await loader();
    } catch (error) {
        console.error(`failed loading the editor grammar for "${mime}"`, error);
        return [];
    }
};

export type { LanguageSupport };
