const { CodeGenerator, withPodfile } = require("@expo/config-plugins");

const POD_DEPLOYMENT_TARGET = "15.1";
const PODFILE_FIXES_TAG = "bada-pod-deployment-target";
const POD_DEPLOYMENT_TARGET_FIX = `    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |build_configuration|
        deployment_target = build_configuration.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
        if deployment_target.nil? || Gem::Version.new(deployment_target) < Gem::Version.new('${POD_DEPLOYMENT_TARGET}')
          build_configuration.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${POD_DEPLOYMENT_TARGET}'
        end
      end
    end`;

/** Podfile의 모든 Pod 타겟에 iOS 최소 배포 버전을 적용한다. */
function applyPodfileFixes(contents) {
  return CodeGenerator.mergeContents({
    src: contents,
    newSrc: POD_DEPLOYMENT_TARGET_FIX,
    tag: PODFILE_FIXES_TAG,
    anchor: /^\s*post_install do \|installer\|\s*$/,
    offset: 1,
    comment: "#",
  }).contents;
}

/** iOS 네이티브 프로젝트 생성 시 Pod 배포 타겟을 보정한다. */
function withPodfileFixes(config) {
  return withPodfile(config, (podfileConfig) => {
    podfileConfig.modResults.contents = applyPodfileFixes(
      podfileConfig.modResults.contents,
    );
    return podfileConfig;
  });
}

module.exports = withPodfileFixes;
module.exports.applyPodfileFixes = applyPodfileFixes;
