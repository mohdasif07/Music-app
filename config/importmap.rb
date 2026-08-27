# Pin npm packages by running ./bin/importmap
#
# Rails 4 port: put the same JS under app/assets/javascripts/application.js
# via Sprockets (no importmap, no Stimulus, no Turbo). Use SoftNav below
# or Turbolinks + data-turbolinks-permanent on #global-player.

pin "application"
