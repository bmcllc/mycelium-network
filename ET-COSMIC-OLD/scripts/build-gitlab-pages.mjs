#!/usr/bin/env node
import { runStaticPwaBuild } from "./build-static-pwa.mjs";

runStaticPwaBuild({ host: "gitlab-pages" });
