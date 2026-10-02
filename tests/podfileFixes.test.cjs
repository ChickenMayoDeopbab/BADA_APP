const assert = require("node:assert/strict");
const { test } = require("node:test");

const {
  applyPodfileFixes,
} = require("../plugins/withPodfileFixes");

const podfile = `target 'app' do
  post_install do |installer|
    react_native_post_install(installer)
  end
end
`;

test("Podfile post_install에 모든 Pod 타겟의 배포 버전 보정을 추가한다", () => {
  const result = applyPodfileFixes(podfile);

  assert.match(result, /installer\.pods_project\.targets\.each/);
  assert.match(result, /IPHONEOS_DEPLOYMENT_TARGET/);
  assert.match(result, /Gem::Version\.new\('15\.1'\)/);
  assert.ok(
    result.indexOf("installer.pods_project.targets.each") <
      result.indexOf("react_native_post_install"),
  );
});

test("Podfile 보정을 반복 적용해도 생성 블록이 중복되지 않는다", () => {
  const firstResult = applyPodfileFixes(podfile);
  const secondResult = applyPodfileFixes(firstResult);

  assert.equal(secondResult, firstResult);
  assert.equal(
    secondResult.match(/@generated begin bada-pod-deployment-target/g)?.length,
    1,
  );
  assert.equal(
    secondResult.match(/installer\.pods_project\.targets\.each/g)?.length,
    1,
  );
});

test("post_install 블록이 없으면 명확한 오류를 반환한다", () => {
  assert.throws(
    () => applyPodfileFixes("target 'app' do\nend\n"),
    /Failed to match/,
  );
});
