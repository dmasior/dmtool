.PHONY: build-mac
build-mac:
	@npm run make -- --platform darwin --arch x64,arm64
