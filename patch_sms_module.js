const fs = require('fs');
const path = require('path');

const filePath = path.join('node_modules', '@maniac-tech', 'react-native-expo-read-sms', 'android', 'src', 'main', 'java', 'com', 'reactlibrary', 'RNExpoReadSmsModule.java');

try {
    let content = fs.readFileSync(filePath, 'utf8');

    // Fix imports
    if (!content.includes('import android.os.Build;')) {
        content = content.replace('import android.os.Bundle;', 'import android.os.Bundle;\nimport android.os.Build;');
        console.log('Added Build import');
    }

    // Pure replacement because the previous script kept chaining the method call if ran multiple times
    if (content.includes('getApplicationInfo().targetSdkVersion')) {
        // Reset to base state roughly or just fix it strictly
        // First remove any existing chain prefix to avoid 'getReactApplicationContext().getReactApplicationContext()...'

        // Simplest approach: Replace the WHOLE LINE if possible, but regex is safer to avoid context loss.
        // The previous regex was: replace /getApplicationInfo().targetSdkVersion/ with <prefix>...
        // If I ran it multiple times, it replaced the already prefixed string.

        // Strategy: Find the specific buggy invocation that DOES NOT have the prefix

        // Actually, looking at the output: .getReactApplicationContext().getReactApplicationContext()...
        // It seems I ran the script multiple times on the same file.

        // Let's force reset the line to a clean state first if possible, or just look for the known good state.

        const targetLineRegex = /if\(Build\.VERSION\.SDK_INT >= 34 && .*getApplicationInfo\(\)\.targetSdkVersion >= 34\) \{/;
        const correctLine = 'if(Build.VERSION.SDK_INT >= 34 && getReactApplicationContext().getApplicationInfo().targetSdkVersion >= 34) {';

        if (targetLineRegex.test(content)) {
            content = content.replace(targetLineRegex, correctLine);
            console.log('Fixed getApplicationInfo call (RESET)');
        }
    }

    fs.writeFileSync(filePath, content, 'utf8');
    console.log('File patched successfully');

} catch (err) {
    console.error('Error patching file:', err);
}
