const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Injects `$RNFirebaseDisableSPM = true` into the generated ios/Podfile,
 * before the `target` block, so that react-native-firebase resolves
 * Firebase via CocoaPods instead of SPM. This is required when using
 * static frameworks (`use_frameworks! :linkage => :static`), because
 * firebase-ios-sdk's SPM package only ships dynamic libraries and will
 * otherwise produce duplicate-symbol linker errors.
 *
 * expo prebuild regenerates the Podfile from scratch every time, so this
 * has to be done via a config plugin rather than a one-off manual edit.
 */
module.exports = function withRNFirebaseDisableSPM(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfilePath, 'utf-8');

      if (!contents.includes('$RNFirebaseDisableSPM')) {
        // Insert right before `platform :ios,` — this is before
        // `prepare_react_native_project!` and before the `target` block,
        // which is what the error message requires.
        contents = contents.replace(
          /platform :ios,/,
          '$RNFirebaseDisableSPM = true\n\nplatform :ios,'
        );
        fs.writeFileSync(podfilePath, contents);
      }

      return config;
    },
  ]);
};
