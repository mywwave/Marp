# Building the mobile Screens dependency

The mobile v5 stack uses a committed tarball from the
[Marp Screens fork](https://github.com/pingdotgg/react-native-screens/tree/marp-v5.0.0-t3.45).
The fork owns the integration changes; the app does not patch this package.
Each archive includes compiled JavaScript, declarations, native source and
`marp-fork.json` recording its version, source commit and upstream base.

To reproduce an archive, use Node 24 and the repository's pinned Yarn from a
clean fork checkout at the source commit recorded in its `marp-fork.json`:

```sh
yarn --cwd /tmp/marp-screens-fork pack:marp /absolute/path/to/marp/apps/mobile/deps
```

For an update, sync the fork's `main` with upstream, merge it and the required
proposal branches into `marp/main`, increment the `5.0.0-marp.N` version, pin `marpFork.upstreamCommit` to the
integrated upstream SHA and commit.
Run `pack:marp` from that clean checkout and tag the source as `marp-v<version>`.
Publish the source commit and tag to the fork before submitting the app change.
Replace the old archive, update `apps/mobile/package.json` and run `vp i` to
regenerate the lockfile. Verify mobile types and affected navigation tests.
Changes to native source also require rebuilding and testing the native client.

The same iOS binary supports iPhone, iPad, and Duo. UIKit hinge updates enable
phone workspace columns at runtime; regular phones retain portrait rotation.
Use the normal EAS build profiles and update channels. Duo support requires a
binary built with the iOS 27.1 SDK; an OTA cannot add the native APIs.
