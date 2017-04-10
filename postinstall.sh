#!/bin/bash
if [ ! -d "gbajs" ]; then
    git clone git@github.com:endrift/gbajs.git
fi

node build.js
