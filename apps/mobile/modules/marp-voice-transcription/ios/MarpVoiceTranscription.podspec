Pod::Spec.new do |s|
  s.name = 'MarpVoiceTranscription'
  s.version = '1.0.0'
  s.summary = 'Local recording conversion for Marp dictation.'
  s.author = 'T3 Tools'
  s.homepage = 'https://marp.com'
  s.platform = :ios, '18.0'
  s.source = { :path => '.' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = '*.swift'
  s.frameworks = 'AudioToolbox'
end
