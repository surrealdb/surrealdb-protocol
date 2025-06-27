<a href="https://surrealdb.com#gh-dark-mode-only" target="_blank">
    <img width="100%" src="/img/white/hero.png" alt="SurrealDB Hero">
</a>
<a href="https://surrealdb.com#gh-light-mode-only" target="_blank">
    <img width="100%" src="/img/black/hero.png" alt="SurrealDB Hero">
</a>

<p align="center">
    <a href="https://github.com/surrealdb/surrealdb"><img src="https://img.shields.io/github/v/release/surrealdb/surrealdb?color=ff00a0&include_prereleases&label=version&sort=semver&style=flat-square"></a>
    &nbsp;
    <a href="https://github.com/surrealdb/surrealdb"><img src="https://img.shields.io/badge/built_with-Rust-dca282.svg?style=flat-square"></a>
    &nbsp;
	<a href="https://github.com/surrealdb/surrealdb/actions"><img src="https://img.shields.io/github/actions/workflow/status/surrealdb/surrealdb/nightly.yml?style=flat-square&branch=main"></a>
    &nbsp;
    <a href="https://github.com/surrealdb/license"><img src="https://img.shields.io/badge/license-BSL_1.1-00bfff.svg?style=flat-square"></a>
</p>

<p align="center">
    <a href="https://hub.docker.com/repository/docker/surrealdb/surrealdb"><img src="https://img.shields.io/docker/pulls/surrealdb/surrealdb?label=docker%20pulls&style=flat-square"></a>
    &nbsp;
    <a href="https://crates.io/crates/surrealdb"><img src="https://img.shields.io/crates/d/surrealdb?color=dca282&label=rust&style=flat-square"></a>
	&nbsp;
    <a href="https://www.npmjs.com/package/surrealdb.js"><img src="https://img.shields.io/npm/dt/surrealdb.js?color=f7df1e&label=javascript&style=flat-square"></a>
    &nbsp;
	<a href="https://pypi.org/project/surrealdb/"><img src="https://img.shields.io/pepy/dt/surrealdb?color=426c99&label=python&style=flat-square"></a>
	&nbsp;
	<a href="https://www.nuget.org/packages/SurrealDb.Net"><img src="https://img.shields.io/nuget/dt/surrealdb.net?color=4c2dcc&label=.NET&style=flat-square"></a>
	&nbsp;
	<a href="https://packagist.org/packages/surrealdb/surrealdb.php"><img src="https://img.shields.io/packagist/dt/surrealdb/surrealdb.php?color=4d588b&label=php&style=flat-square"></a>
    &nbsp;
	<a href="https://hub.docker.com/repository/docker/surrealdb/surrealdb"><img src="https://img.shields.io/github/downloads/surrealdb/surrealdb/total?color=8259dd&label=github%20downloads&style=flat-square"></a>
</p>

<p align="center">
	<a href="https://surrealdb.com/discord"><img src="https://img.shields.io/discord/902568124350599239?label=discord&style=flat-square&color=5a66f6" alt="Discord"></a>
	&nbsp;
    <a href="https://x.com/surrealdb"><img src="https://img.shields.io/badge/x-follow_us-222222.svg?style=flat-square" alt="X"></a>
    &nbsp;
    <a href="https://dev.to/surrealdb"><img src="https://img.shields.io/badge/dev-join_us-86f7b7.svg?style=flat-square" alt="Dev"></a>
    &nbsp;
    <a href="https://www.linkedin.com/company/surrealdb/"><img src="https://img.shields.io/badge/linkedin-connect_with_us-0a66c2.svg?style=flat-square" alt="LinkedIn"></a>
	&nbsp;
    <a href="https://www.youtube.com/@surrealdb"><img src="https://img.shields.io/badge/youtube-subscribe-fc1c1c.svg?style=flat-square" alt="YouTube"></a>
</p>

<p align="center">
	<a href="https://surrealdb.com/blog"><img height="25" src="./img/social/blog.svg" alt="Blog"></a>
	&nbsp;
	<a href="https://github.com/surrealdb/surrealdb"><img height="25" src="./img/social/github.svg" alt="Github"></a>
	&nbsp;
    <a href="https://www.linkedin.com/company/surrealdb/"><img height="25" src="./img/social/linkedin.svg" alt="LinkedIn"></a>
    &nbsp;
    <a href="https://x.com/surrealdb"><img height="25" src="./img/social/x.svg" alt="X"></a>
    &nbsp;
    <a href="https://www.youtube.com/@surrealdb"><img height="25" src="./img/social/youtube.svg" alt="YouTube"></a>
    &nbsp;
    <a href="https://dev.to/surrealdb"><img height="25" src="./img/social/dev.svg" alt="Dev"></a>
    &nbsp;
    <a href="https://surrealdb.com/discord"><img height="25" src="./img/social/discord.svg" alt="Discord"></a>
    &nbsp;
    <a href="https://stackoverflow.com/questions/tagged/surrealdb"><img height="25" src="./img/social/stack-overflow.svg" alt="Stack Overflow"></a>
</p>

<br>

<h2><img height="20" src="./img/whatissurreal.svg">&nbsp;&nbsp;SurrealDB Network Protocol</h2>

This repository contains the SurrealDB Network Protocol, which is used to communicate with the SurrealDB server.

**THIS IS A WORK IN PROGRESS**

## Development

Generate the protobuf files:

```bash
make gen
```

Note: These are not currently generated in CI or automatically checked in CI. This is a manual step for the time
being but in the future we will have a CI step that ensures that the protobuf files are up to date.
