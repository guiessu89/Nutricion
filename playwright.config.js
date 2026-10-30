import {existsSync} from 'node:fs';
export default {
 testDir:'./tests',
 use:{browserName:'chromium',launchOptions:{...(existsSync('/usr/bin/chromium')?{executablePath:'/usr/bin/chromium'}:{}),args:['--no-sandbox']},baseURL:'http://127.0.0.1:5173'},
 workers:1,
 webServer:{command:'npm start',url:'http://127.0.0.1:5173',reuseExistingServer:!process.env.CI},
};
