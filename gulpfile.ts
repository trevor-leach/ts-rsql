import gulp   from "gulp";
import del    from "del"
import path   from "path"
import fs     from "fs"
import pegjs  from "peggy"
import tspegjs from "ts-pegjs"
import {spawn} from 'child_process'
//import './package.json'

 const config: {[key:string]: string} = 
 	JSON.parse(fs.readFileSync('package.json', 'utf-8')).config;

gulp.task("clean", async function clean(): Promise<string[]> {
	console.log("cleaning...")
	return del([
			config["dist_dir"],
			config["docs_dir"],
			config["coverage_dir"],
			config["parser_file"],
			config["reports_dir"]
		]
	);
});

gulp.task("initialize",  function initialize(done): void {
	done();
})

gulp.task("generateSources", gulp.series("initialize", async function generateSources() {

	if (await isNewerPath(config["grammar_file"], config["parser_file"])) {

		return generate_parser_file(config["grammar_file"], config["parser_file"]);

	} else {
		console.log("    skipping generation...")
	}
}));

gulp.task("processSources", gulp.series("generateSources", function processSources(done) {
    done()
}))

gulp.task("generateResources", gulp.series("processSources", function generateResources(done) {
    done()
}))

gulp.task("processResources", gulp.series("generateResources", function processResources(done) {
    done()
}))

gulp.task("compile", gulp.series("processResources", async function compile() {

	if (await isNewerPath(config["main_ts_src_dir"], config["dist_dir"])) {
		console.log("    transpiling Typescript...")
		return new Promise<void>((resolve, reject)  => {
			spawn('npx', ['tsc', '--build', 'tsconfig.json'])
			.on('exit', (code) => {
				if(code) reject('Compilation failed'); else resolve();
			})
		});
	} else {
		console.log("    skipping transpilation...")
	}
}))

gulp.task("processCompilation", gulp.series("compile", function processCompilation(done) {
    done()
}))

gulp.task("generateTestSources", gulp.series("processCompilation", function generateTestSources(done) {
    done()
}))

gulp.task("processTestSources", gulp.series("generateTestSources", function processTestSources(done) {
    done()
}))

gulp.task("generateTestResources", gulp.series("processTestSources", function generateTestResources(done) {
    done()
}))

gulp.task("processTestResources", gulp.series("generateTestResources", function processTestResources(done) {
    done()
}))

gulp.task("test", gulp.series("processTestResources", async function test() {
	console.log("testing...");
    return new Promise<void>((resolve, reject) => {
		const proc = spawn('npx', ['jest', '--coverage']);
		proc.stdout.pipe(process.stdout);
		proc.stderr.pipe(process.stderr);
		proc.on('exit', (code) => {
			if(code) reject('tests failed'); else resolve();
		});
	});
}))

gulp.task("docs", gulp.series("processSources", async function docs() {
	if(await isNewerPath(config["main_ts_src_dir"], config["docs_dir"]) ||
       await isNewerPath('ReadMe.md', config["docs_dir"]))
    {
		console.log(`    generating Typescript docs to ${config["docs_dir"]}...`)
		return new Promise<void>((resolve, reject)  => {
			const proc = spawn('npx', [
				'typedoc',
				'--out', config["docs_dir"],
				'--excludeInternal',
				'--exclude', config["main_ts_src_dir"]+"/parser.ts",
                path.join(config["main_ts_src_dir"], 'index.ts')]);
            
            proc.stdout.pipe(process.stdout);
            proc.stderr.pipe(process.stderr);
            proc.on('exit', (code) => {
                if(code) reject('documentation failed'); else resolve();
            });
		});
	} else {
		console.log("    skipping documentation...")
	}
}));

gulp.task("preparePackage", gulp.series("test", function preparePackage(done) {
    done()
}))

gulp.task("package", gulp.series("preparePackage", function _package(done) {
    done()
}))

gulp.task("publishDev", gulp.series("package", async function publishDev() {
	console.log("Publishing to the snapshot repo...");
    return new Promise<void>((resolve, reject)  => {
		spawn('npm', [
			'publish',
			'--dry-run'])
		.on('exit', (code) => {
			if(code) reject('publishDev failed'); else resolve();
		});
	});
}));

gulp.task("preIntegrationTest", gulp.series("package", function preIntegrationTest(done) {
    done()
}))

gulp.task("integrationTest", gulp.series("preIntegrationTest", function integrationTest(done) {
    done()
}))

gulp.task("postIntegrationTest", gulp.series("integrationTest", function postIntegrationTest(done) {
    done()
}))

gulp.task("verify", gulp.series("postIntegrationTest", function verify(done) {
    done()
}))

gulp.task("install", gulp.series("verify", function install(done) {
    done()
}))

gulp.task("deploy", gulp.series("install", function deploy(done) {
    done()
}))

gulp.task("default", gulp.series("clean", "compile", gulp.parallel("test", "docs")))


async function generate_parser_file(grammar_file: string, parser_file: string) {

	console.log(`    generating ${parser_file} from ${grammar_file}`);
	const [grammar_str, _]  = await Promise.all([
		fs.promises.readFile(grammar_file, "utf8"),
		fs.promises.mkdir(path.dirname(parser_file), {recursive: true}),
	]);

    //@ts-ignore
	const parser_code = pegjs.generate(
		grammar_str,
		{
			output: "source",
			format: "commonjs",
			allowedStartRules: ["rsql", "projection", "sort"],
			plugins: [tspegjs],
			"tspegjs": {
				"noTslint": false,
				"tslintIgnores": "rule1,rule2",
				"customHeader": "import * as ast from './ast'"
			}
		});

	return fs.promises.writeFile(parser_file, parser_code, "utf8");
}

/**
 * Asynchronous generator that returns Stat of each file under the given dir.
 * @param dir path under which to recursively search.
 */
async function* walk(dir: string) {
    for await (const d of await fs.promises.opendir(dir)) {
        const entry = path.join(dir, d.name);
        if (d.isDirectory()) yield* await walk(entry);
        else if (d.isFile()) yield await fs.promises.stat(entry);
    }
}


/**
 * Determines if a source path has a newer file than any file in a
 * target path, or if the target does not exist.
 * 
 * @param source File or directory path.
 * @param target File or directory path.
 * 
 * @returns `true` if target does not exist, or if any file under
 *          -and including- source is newer that any in target, and 
 *          `false` otherwise.
 */
async function isNewerPath(source: string, target: string): Promise<boolean> {
	if (!fs.existsSync(target)) {
		console.log(`${target} doesn't exist.`)
		return true;
	}

	let source_stat = fs.statSync(source);
	let oldest_source_file_time = source_stat.mtimeMs;
	if (source_stat.isDirectory()) {
		for await (source_stat of walk(config["main_ts_src_dir"])) {
			if (source_stat.mtimeMs > oldest_source_file_time) {
				oldest_source_file_time = source_stat.mtimeMs;
			}
		}
	}

	let target_stat = fs.statSync(target);
	let sourceIsNewer = target_stat.mtimeMs < oldest_source_file_time;
	if (target_stat.isDirectory() && !sourceIsNewer) {
		for await (let target_stat of walk(target)) {
			if (target_stat.mtimeMs < oldest_source_file_time) {
				sourceIsNewer = true;
				break;
			}
		}
	}
	
	console.log(sourceIsNewer ?
		`${source} is more recent than ${target}` :
		`${source} is older than ${target}`);
	
	return sourceIsNewer;
}