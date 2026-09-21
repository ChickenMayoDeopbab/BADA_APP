const { execFileSync, spawn } = require('node:child_process');
const path = require('node:path');

const env = { ...process.env };
// macOS may default to a newer JDK unsupported by the project's Gradle/Kotlin.
// Select an installed compatible JDK for this command without changing the shell.
if (process.platform === 'darwin') {
  let javaHome;
  for (const version of ['21', '17']) {
    try {
      javaHome = execFileSync('/usr/libexec/java_home', ['-v', version], {
        encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
      }).trim();
      break;
    } catch { /* Try the next supported JDK. */ }
  }
  if (!javaHome) {
    process.stderr.write('Android 빌드에는 JDK 21 또는 17이 필요합니다. 설치 후 다시 실행하세요.\n');
    process.exit(1);
  }
  env.JAVA_HOME = javaHome;
  env.PATH = `${path.join(javaHome, 'bin')}${path.delimiter}${env.PATH || ''}`;
}

const expoCli = path.join(path.dirname(require.resolve('expo/package.json')), 'bin', 'cli');
const child = spawn(process.execPath, [expoCli, 'run:android', ...process.argv.slice(2)], {
  env, stdio: 'inherit',
});
child.on('error', (error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
child.on('exit', (code) => { process.exitCode = code ?? 1; });
