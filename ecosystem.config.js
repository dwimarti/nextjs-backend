// if yarn bug exist
// pm2 start yarn --interpreter bash --name next-api-service -- start

//erorr
/*
    /usr/share/yarn/bin/yarn:2
    argv0=$(echo "$0" | sed -e 's,\\,/,g')
        ^^^^
*/

module.exports = {
  apps : [{
    name      : 'yarn',
    script    : 'yarn',
    args      : 'start',
    interpreter: '/bin/bash',
    env: {
      NODE_ENV: 'development'
    }
  }]
};