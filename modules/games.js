/* jshint node: true, esversion: 6, eqeqeq: true, latedef: true, undef: true, unused: true */
"use strict";

var config = require('config');
var lodash = require('lodash');

var database = require('../database');

module.exports = function(app, io, self, server) {
    var gameServerPool = config.get('app.servers.pool');

    self.on('gameSetup', function(game) {
        game.status = 'launching';
        game.save();

        // NOTE: forces a user update so they cannot add up to another game
        self.emit('retrieveUsers', lodash.map(game.players, function(player) {
            return player.user;
        }));

        self.emit('cleanUpDraft');

        let gameServer = gameServerPool[game.server];

        lodash.each(game.players, function(player) {
            self.emit('sendMessageToUser', {
                userID: player.user,
                name: 'currentGame',
                arguments: [{
                    game: game.id,
                    address: gameServer.address,
                    password: gameServer.password
                }]
            });
        });

        // TODO: set timeout for game abortion
    });

    self.on('gameLive', function(game) {
        // TODO: update game
    });

    self.on('gameAbandoned', function(game) {
        // TODO: update game
    });

    self.on('gameCompleted', function(game) {
        // TODO: update game
    });

    io.sockets.on('authenticated', function(socket) {
        let userID = socket.decoded_token;

        database.Game.findOne({'players.user': userID, status: {$in: ['launching', 'live']}}, function(err, game) {
            if (game) {
                let gameServer = gameServerPool[game.server];

                socket.emit('currentGame', {
                    game: game.id,
                    address: gameServer.address,
                    password: gameServer.password
                });
            }
            else {
                socket.emit('currentGame', null);
            }
        });
    });
};