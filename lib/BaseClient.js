"use strict";

const ApplicationCommand = require("./structures/ApplicationCommand");
const Base = require("./structures/Base");
const Channel = require("./structures/Channel");
const Collection = require("./util/Collection");
const Constants = require("./Constants");
const Endpoints = require("./rest/Endpoints");
const ExtendedUser = require("./structures/ExtendedUser");
const Guild = require("./structures/Guild");
const GuildAuditLogEntry = require("./structures/GuildAuditLogEntry");
const GuildIntegration = require("./structures/GuildIntegration");
const GuildPreview = require("./structures/GuildPreview");
const GuildTemplate = require("./structures/GuildTemplate");
const GuildScheduledEvent = require("./structures/GuildScheduledEvent");
const Invite = require("./structures/Invite");
const Member = require("./structures/Member");
const Message = require("./structures/Message");
const Permission = require("./structures/Permission");
const PrivateChannel = require("./structures/PrivateChannel");
const RequestHandler = require("./rest/RequestHandler");
const Role = require("./structures/Role");
const ShardManager = require("./gateway/ShardManager");
const StageInstance = require("./structures/StageInstance");
const ThreadMember = require("./structures/ThreadMember");
const UnavailableGuild = require("./structures/UnavailableGuild");
const User = require("./structures/User");
const VoiceConnectionManager = require("./voice/VoiceConnectionManager");
const AutoModerationRule = require("./structures/AutoModerationRule");
const emitDeprecation = require("./util/emitDeprecation");
const VoiceState = require("./structures/VoiceState");
const Entitlement = require("./structures/Entitlement");

let EventEmitter;
try {
    EventEmitter = require("eventemitter3");
} catch{
    EventEmitter = require("node:events");
}
let Erlpack;
try {
    Erlpack = require("erlpack");
} catch{ // eslint-disable no-empty
}

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

/**
 * Represents the  Dysnomia client object
 * @extends EventEmitter
 */
class BaseClient extends EventEmitter {
    /**
     * Object mapping channel IDs to guild IDs
     * @type {Object<string, string>}
     */
    channelGuildMap = {};
    /**
     * Collection of guilds the bot is in
     * @type {Collection<Guild>}
     */
    guilds = new Collection(Guild);
    /**
     * Object mapping guild IDs to shard IDs
     * @type {Object<string, number>}
     */
    guildShardMap = {};
    lastConnect = 0;
    lastReconnectDelay = 0;
    presence = {
        activities: null,
        afk: false,
        since: null,
        status: "offline"
    };

    /**
     * Object mapping user IDs to private channel IDs
     * @type {Object<string, string>}
     */
    privateChannelMap = {};
    /**
     * Collection of private channels the bot is in
     * @type {Collection<PrivateChannel>}
     */
    privateChannels = new Collection(PrivateChannel);
    ready = false;
    reconnectAttempts = 0;
    /**
     * Timestamp of bot ready event
     * @type {Number}
     */
    startTime = 0;
    /**
     * Object mapping thread channel IDs to guild IDs
     * @type {Object<string, string>}
     */
    threadGuildMap = {};
    /**
     * Collection of unavailable guilds the bot is in
     * @type {Collection<UnavailableGuild>}
     */
    unavailableGuilds = new Collection(UnavailableGuild);
    /**
     * Collection of users the bot sees
     * @type {Collection<User>}
     */
    users = new Collection(User);
    /**
     * Extended collection of active VoiceConnections the bot has
     * @type {Collection<VoiceConnection>}
     */
    voiceConnections = new VoiceConnectionManager();

    /**
     * Object containing the bot application's ID and its public flags
     * @member {Object?} Client#application
     */

    /**
     * The bot user
     * @member {ExtendedUser} Client#user
     */

    /**
     * Create a Client
     * @param {String} token The auth token to use. Bot tokens should be prefixed with `Bot` (e.g. `Bot MTExIHlvdSAgdHJpZWQgMTEx.O5rKAA.dQw4w9WgXcQ_wpV-gGA4PSk_bm8`).
     * @param {Object} options Dysnomia client options
     * @param {Object} [options.allowedMentions] A list of mentions to allow by default in createMessage/editMessage
     * @param {Boolean} [options.allowedMentions.everyone] Whether or not to allow @everyone/@here
     * @param {Boolean | Array<String>} [options.allowedMentions.roles] Whether or not to allow all role mentions, or an array of specific role mentions to allow
     * @param {Boolean | Array<String>} [options.allowedMentions.users] Whether or not to allow all user mentions, or an array of specific user mentions to allow
     * @param {Boolean} [options.allowedMentions.repliedUser] Whether or not to mention the author of the message being replied to
     * @param {String} [options.defaultImageFormat="jpg"] The default format to provide user avatars, guild icons, and group icons in. Can be "jpg", "png", "gif", or "webp"
     * @param {Number} [options.defaultImageSize=128] The default size to return user avatars, guild icons, banners, splashes, and group icons. Can be any power of two between 16 and 2048. If the height and width are different, the width will be the value specified, and the height relative to that
     * @param {Object} [options.gateway] Options for gateway connections
     * @param {Boolean} [options.gateway.autoreconnect=true] Have Dysnomia autoreconnect when connection is lost
     * @param {Boolean} [options.gateway.compress=false] Whether to request WebSocket data to be compressed or not
     * @param {Number} [options.gateway.connectionTimeout=30000] How long in milliseconds to wait for the connection to handshake with the server
     * @param {Object} [options.gateway.disableEvents] If disableEvents[eventName] is true, the WS event will not be processed. This can cause significant performance increase on large bots. [A full list of the WS event names in Discord's documentation](https://discord.com/developers/docs/topics/gateway-events#receive-events)
     * @param {Number} [options.gateway.firstShardID=0] The ID of the first shard to run for this client
     * @param {Boolean} [options.gateway.getAllUsers=false] Get all the users in every guild. Ready time will be severely delayed
     * @param {Number} [options.gateway.guildCreateTimeout=2000] How long in milliseconds to wait for a GUILD_CREATE before "ready" is fired. Increase this value if you notice missing guilds
     * @param {Number | Array<String | Number>} [options.gateway.intents] A list of [intent names](https://github.com/projectdysnomia/dysnomia/blob/dev/lib/Constants.js#L311), pre-shifted intent numbers to add, or a raw bitmask value describing the intents to subscribe to. Some intents, like `guildPresences` and `guildMembers`, must be enabled on your application's page to be used. By default, all non-privileged intents are enabled.
     * @param {Number} [options.gateway.largeThreshold=250] The maximum number of offline users per guild during initial guild data transmission
     * @param {Number} [options.gateway.lastShardID=options.maxShards - 1] The ID of the last shard to run for this client
     * @param {Number} [options.gateway.maxReconnectAttempts=Infinity] The maximum amount of times that the client is allowed to try to reconnect to Discord.
     * @param {Number} [options.gateway.maxResumeAttempts=10] The maximum amount of times a shard can attempt to resume a session before considering that session invalid.
     * @param {Number | String} [options.gateway.maxConcurrency=1] The number of shards that can start simultaneously. If "auto" Dysnomia will use Discord's recommended shard concurrency.
     * @param {Number | String} [options.gateway.maxShards=1] The total number of shards you want to run. If "auto" Dysnomia will use Discord's recommended shard count.
     * @param {Function} [options.gateway.reconnectDelay] A function which returns how long the bot should wait until reconnecting to Discord.
     * @param {Boolean} [options.gateway.seedVoiceConnections=false] Whether to populate bot.voiceConnections with existing connections the bot account has during startup. Note that this will disconnect connections from other bot sessions
     * @param {Number} [options.messageLimit=100] The maximum size of a channel message cache
     * @param {Boolean} [options.opusOnly=false] Whether to suppress the Opus encoder not found error or not
     * @param {Object} [options.rest] Options for the REST request handler
     * @param {Object} [options.rest.agent] A HTTPS Agent (if https: true, default) or an HTTP agent (if https: false) used to proxy requests
     * @param {String} [options.rest.baseURL] The base URL to use for API requests. Defaults to `/api/v${REST_VERSION}`
     * @param {Boolean} [options.rest.disableLatencyCompensation=false] Whether to disable the built-in latency compensator or not
     * @param {String} [options.rest.domain="discord.com"] The domain to use for API requests
     * @param {Boolean} [options.rest.https=true] Whether to make requests to the Discord API over HTTPS (true) or HTTP (false)
     * @param {Number} [options.rest.latencyThreshold=30000] The average request latency at which Dysnomia will start emitting latency errors
     * @param {Number} [options.rest.port] The port to use for API requests. Defaults to 443 (HTTPS) or 80 (HTTP)
     * @param {Object} [options.rest.headers] Headers to be appended in REST requests
     * @param {Number} [options.rest.ratelimiterOffset=0] A number of milliseconds to offset the ratelimit timing calculations by
     * @param {Number} [options.rest.requestTimeout=15000] A number of milliseconds before REST requests are considered timed out
     * @param {Boolean} [options.restMode=false] Whether to enable getting objects over REST. Even with this option enabled, it is recommended that you check the cache first before using REST
     * @param {Object} [options.ws] An object of WebSocket options to pass to the shard WebSocket constructors
     */
    constructor(token, options) {
        super();

        /**
         * Dysnomia options
         * @type {Object}
         */
        this.options = Object.assign({
            allowedMentions: {
                users: true,
                roles: true
            },
            defaultImageFormat: "jpg",
            defaultImageSize: 128,
            messageLimit: 100,
            opusOnly: false,
            rest: {},
            restMode: false,
            ws: {},
            gateway: {}
        }, options);
        this.options.allowedMentions = this._formatAllowedMentions(this.options.allowedMentions);
        if(!Constants.ImageFormats.includes(this.options.defaultImageFormat.toLowerCase())) {
            throw new TypeError(`Invalid default image format: ${this.options.defaultImageFormat}`);
        }
        const defaultImageSize = this.options.defaultImageSize;
        if(defaultImageSize < Constants.ImageSizeBoundaries.MINIMUM || defaultImageSize > Constants.ImageSizeBoundaries.MAXIMUM || (defaultImageSize & (defaultImageSize - 1))) {
            throw new TypeError(`Invalid default image size: ${defaultImageSize}`);
        }
        // Set HTTP Agent on Websockets if not already set
        if(this.options.rest.agent && !this.options.ws?.agent) {
            this.options.ws ??= {};
            this.options.ws.agent = this.options.rest.agent;
        }

        Object.defineProperty(this, "_token", {
            configurable: true,
            enumerable: false,
            writable: true,
            value: token
        });

        /**
         * The request handler the client will use
         * @type {RequestHandler}
         */
        this.requestHandler = new RequestHandler(this, this.options.rest);
        delete this.options.rest;

        /**
         * Collection of shards Dysnomia is using
         * @type {Collection<Shard>}
         */
        this.shards = new ShardManager(this, this.options.gateway);
        delete this.options.gateway;

        /**
         * Whether the user belongs to an OAuth2 application
         * @type {Boolean}
         */
        this.bot = this._token.startsWith("Bot ");

        this.connect = this.connect.bind(this);
    }

    /**
     * How long in milliseconds the bot has been up for
     * @type {Number}
     */
    get uptime() {
        return this.startTime ? Date.now() - this.startTime : 0;
    }

    /**
     * Add a member to a guild
     * @param {String} guildID The ID of the guild
     * @param {String} userID The ID of the user
     * @param {String} accessToken The access token of the user
     * @param {Object} [options] Options for adding the member
     * @param {String} [options.nick] The nickname of the member
     * @param {Array<String>} [options.roles] Array of role IDs to add to the member
     * @param {Boolean} [options.mute] Whether the member should be muted
     * @param {Boolean} [options.deaf] Whether the member should be deafened
     * @returns {Promise}
     */
    addGuildMember(guildID, userID, accessToken, options = {}) {
        return this.requestHandler.request("PUT", Endpoints.GUILD_MEMBER(guildID, userID), true, {
            access_token: accessToken,
            nick: options.nick,
            roles: options.roles,
            mute: options.mute,
            deaf: options.deaf
        });
    }

    /**
     * Add a role to a guild member
     * @param {String} guildID The ID of the guild
     * @param {String} memberID The ID of the member
     * @param {String} roleID The ID of the role
     * @param {String} [reason] The reason to be displayed in audit logs
     * @returns {Promise}
     */
    addGuildMemberRole(guildID, memberID, roleID, reason) {
        return this.requestHandler.request("PUT", Endpoints.GUILD_MEMBER_ROLE(guildID, memberID, roleID), true, {
            reason
        });
    }

    /**
     * Add a reaction to a message
     * @param {String} channelID The ID of the channel
     * @param {String} messageID The ID of the message
     * @param {String} reaction The reaction (Unicode string if Unicode emoji, `emojiName:emojiID` if custom emoji)
     * @returns {Promise}
     */
    addMessageReaction(channelID, messageID, reaction) {
        if(reaction === decodeURI(reaction)) {
            reaction = encodeURIComponent(reaction);
        }
        return this.requestHandler.request("PUT", Endpoints.CHANNEL_MESSAGE_REACTION_USER(channelID, messageID, reaction, "@me"), true);
    }

    /**
     * Ban a user from a guild
     * @param {String} guildID The ID of the guild
     * @param {String} userID The ID of the user
     * @param {Number} [options.deleteMessageSeconds=0] Number of seconds to delete messages for, between 0 and 604800 inclusive
     * @param {String} [options.reason] The reason to be displayed in audit logs
     * @returns {Promise}
     */
    banGuildMember(guildID, userID, options) {
        return this.requestHandler.request("PUT", Endpoints.GUILD_BAN(guildID, userID), true, {
            delete_message_seconds: options.deleteMessageSeconds || 0,
            reason: options.reason
        });
    }

    /**
     * Ban multiple users from a guild
     * @param {String} guildID The ID of the guild
     * @param {Array<String>} userIDs An array of user IDs to ban
     * @param {Number} [options.deleteMessageSeconds=0] Number of seconds to delete messages for, between 0 and 604800 inclusive
     * @param {String} [options.reason] The reason to be displayed in audit logs
     * @returns {Promise<{ bannedUsers: Array<String>, failedUsers: Array<String> }>} A Promise resolving with an object containing an array of banned users and an array of users for whom the ban operation failed. In case banning all specified users fails, this promise rejects with an error.instead.
     */
    bulkBanGuildMembers(guildID, userIDs, options = {}) {
        return this.requestHandler.request("POST", Endpoints.GUILD_BULK_BAN(guildID), true, {
            user_ids: userIDs,
            delete_message_seconds: options.deleteMessageSeconds || 0,
            reason: options.reason
        }).then((result) => ({
            bannedUsers: result.banned_users,
            failedUsers: result.failed_users
        }));
    }

    /**
     * Edits command permissions for a multiple commands in a guild.
     * Note: You can only add up to 10 permission overwrites for a command.
     * @param {String} guildID The guild ID
     * @param {Array<Object>} permissions An array of [partial guild command permissions](https://discord.com/developers/docs/interactions/application-commands#application-command-permissions-object-guild-application-command-permissions-structure)
     * @returns {Promise<Array<Object>>} Returns an array of [GuildApplicationCommandPermissions](https://discord.com/developers/docs/interactions/application-commands#application-command-permissions-object-guild-application-command-permissions-structure) objects.
     */
    bulkEditCommandPermissions(guildID, permissions) {
        return this.requestHandler.request("PUT", Endpoints.GUILD_COMMAND_PERMISSIONS(this.application.id, guildID), true, permissions);
    }

    /**
     * Bulk create/edit global application commands
     * @param {Array<Object>} commands An array of [Command objects](https://discord.com/developers/docs/interactions/application-commands#application-command-object)
     * @returns {Promise<ApplicationCommand[]>}
     */
    bulkEditCommands(commands) {
        for(const command of commands) {
            if(command.name !== undefined && command.type === 1) {
                command.name = command.name.toLowerCase();
            }
            if(command.defaultMemberPermissions !== undefined) {
                command.defaultMemberPermissions = command.defaultMemberPermissions instanceof Permission ? String(command.defaultMemberPermissions.allow) : String(command.defaultMemberPermissions);
            }
            command.default_member_permissions = command.defaultMemberPermissions;
            command.dm_permission = command.dmPermission;
            command.description_localizations = command.descriptionLocalizations;
            command.name_localizations = command.nameLocalizations;
        }
        return this.requestHandler.request("PUT", Endpoints.COMMANDS(this.application.id), true, commands).then((applicationCommands) => applicationCommands.map((applicationCommand) => new ApplicationCommand(applicationCommand, this)));
    }

    /**
     * Bulk create/edit guild application commands
     * @param {String} guildID Guild id to create the commands in
     * @param {Array<Object>} commands An array of [Command objects](https://discord.com/developers/docs/interactions/application-commands#application-command-object)
     * @returns {ApplicationCommand[]} Resolves with an array of commands objects
     */
    bulkEditGuildCommands(guildID, commands) {
        for(const command of commands) {
            if(command.name !== undefined && command.type === 1) {
                command.name = command.name.toLowerCase();
            }
            if(command.defaultMemberPermissions !== undefined) {
                command.defaultMemberPermissions = command.defaultMemberPermissions instanceof Permission ? String(command.defaultMemberPermissions.allow) : String(command.defaultMemberPermissions);
            }
            command.default_member_permissions = command.defaultMemberPermissions;
            command.description_localizations = command.descriptionLocalizations;
            command.name_localizations = command.nameLocalizations;
        }
        return this.requestHandler.request("PUT", Endpoints.GUILD_COMMANDS(this.application.id, guildID), true, commands).then((applicationCommands) => applicationCommands.map((applicationCommand) => new ApplicationCommand(applicationCommand, this)));
    }

    /**
     * Closes a voice connection with a guild ID
     * @param {String} guildID The ID of the guild
     */
    closeVoiceConnection(guildID) {
        this.shards.get(this.guildShardMap[guildID] || 0).sendWS(Constants.GatewayOPCodes.VOICE_STATE_UPDATE, {
            guild_id: guildID || null,
            channel_id: null,
            self_mute: false,
            self_deaf: false
        });
        this.voiceConnections.leave(guildID);
    }

    /**
     * Tells all shards to connect. This will call `getBotGateway()`, which is ratelimited.
     * @returns {Promise} Resolves when all shards are initialized
     */
    async connect() {
        if(typeof this._token !== "string") {
            throw new Error(`Invalid token "${this._token}"`);
        }
        try {
            const data = await (this.shards.options.maxShards === "auto" || (this.shards.options.shardConcurrency === "auto" && this.bot) ? this.getBotGateway() : this.getGateway());
            if(!data.url || (this.shards.options.maxShards === "auto" && !data.shards)) {
                throw new Error("Invalid response from gateway REST call");
            }
            if(data.url.includes("?")) {
                data.url = data.url.substring(0, data.url.indexOf("?"));
            }
            if(!data.url.endsWith("/")) {
                data.url += "/";
            }
            /**
             * The URL for the discord gateway
             * @type {String}
             */
            this.gatewayURL = `${data.url}?v=${Constants.GATEWAY_VERSION}&encoding=${Erlpack ? "etf" : "json"}`;

            if(this.shards.options.compress) {
                this.gatewayURL += "&compress=zlib-stream";
            }

            if(this.shards.options.maxShards === "auto") {
                if(!data.shards) {
                    throw new Error("Failed to autoshard due to lack of data from Discord.");
                }
                this.shards.options.maxShards = data.shards;
                this.shards.options.lastShardID ??= data.shards - 1;
            }

            if(this.shards.options.shardConcurrency === "auto" && typeof data.session_start_limit?.max_concurrency === "number") {
                this.shards.options.maxConcurrency = data.session_start_limit.max_concurrency;
            }

            for(let i = this.shards.options.firstShardID; i <= this.shards.options.lastShardID; ++i) {
                this.shards.spawn(i);
            }
        } catch(err) {
            if(!this.shards.options.autoreconnect) {
                throw err;
            }
            const reconnectDelay = this.shards.options.reconnectDelay(this.lastReconnectDelay, this.reconnectAttempts);
            await sleep(reconnectDelay);
            this.lastReconnectDelay = reconnectDelay;
            this.reconnectAttempts = this.reconnectAttempts + 1;
            return this.connect();
        }
    }

    /**
     * Consumes a one-time purchasable entitlement
     * @param {String} entitlementID The ID of the entitlement to consume
     * @returns {Promise}
     */
    consumeEntitlement(entitlementID) {
        return this.requestHandler.request("POST", Endpoints.ENTITLEMENT_CONSUME(this.application.id, entitlementID), true);
    }

    /**
     * Create an application emoji object
     * @param {Object} options Emoji options
     * @param {String} options.image The base 64 encoded string
     * @param {String} options.name The name of emoji
     * @returns {Promise<Object>} An application emoji object
     */
    createApplicationEmoji(options) {
        return this.requestHandler.request("POST", Endpoints.APPLICATION_EMOJIS(this.application.id), true, options);
    }

    /**
     * Delete an application emoji object
     * @param {String} emojiID The ID of the emoji
     * @returns {Promise}
     */
    deleteApplicationEmoji(emojiID) {
        return this.requestHandler.request("DELETE", Endpoints.APPLICATION_EMOJI(this.application.id, emojiID), true);
    }

    /**
     * Delete an auto moderation rule
     * @param {String} guildID The guildID to delete the rule from
     * @param {String} ruleID The ID of the rule to delete
     * @param {String} [reason] The reason to be displayed in audit logs
     * @returns {Promise}
     */
    deleteAutoModerationRule(guildID, ruleID, reason) {
        return this.requestHandler.request("DELETE", Endpoints.AUTO_MODERATION_RULE(guildID, ruleID), true, {
            reason
        });
    }

    /**
     * Delete a guild channel, or leave a private channel
     * @param {String} channelID The ID of the channel
     * @param {String} [reason] The reason to be displayed in audit logs
     * @returns {Promise}
     */
    deleteChannel(channelID, reason) {
        return this.requestHandler.request("DELETE", Endpoints.CHANNEL(channelID), true, {
            reason
        });
    }

    /**
     * Delete a channel permission overwrite
     * @param {String} channelID The ID of the channel
     * @param {String} overwriteID The ID of the overwritten user or role
     * @param {String} [reason] The reason to be displayed in audit logs
     * @returns {Promise}
     */
    deleteChannelPermission(channelID, overwriteID, reason) {
        return this.requestHandler.request("DELETE", Endpoints.CHANNEL_PERMISSION(channelID, overwriteID), true, {
            reason
        });
    }

    /**
     * Delete a global application command
     * @param {String} commandID The command id
     * @returns {Promise}
     */
    deleteCommand(commandID) {
        return this.requestHandler.request("DELETE", Endpoints.COMMAND(this.application.id, commandID), true);
    }

    /**
     * Delete a guild (bot user must be owner)
     * @param {String} guildID The ID of the guild
     * @returns {Promise}
     */
    deleteGuild(guildID) {
        return this.requestHandler.request("DELETE", Endpoints.GUILD(guildID), true);
    }

    /**
     * Delete a guild application command
     * @param {String} guildID The guild ID
     * @param {String} commandID The command id
     * @returns {Promise}
     */
    deleteGuildCommand(guildID, commandID) {
        return this.requestHandler.request("DELETE", Endpoints.GUILD_COMMAND(this.application.id, guildID, commandID), true);
    }

    /**
     * Delete a guild emoji object
     * @param {String} guildID The ID of the guild to delete the emoji in
     * @param {String} emojiID The ID of the emoji
     * @param {String} [reason] The reason to be displayed in audit logs
     * @returns {Promise}
     */
    deleteGuildEmoji(guildID, emojiID, reason) {
        return this.requestHandler.request("DELETE", Endpoints.GUILD_EMOJI(guildID, emojiID), true, {
            reason
        });
    }

    /**
     * Delete a guild integration
     * @param {String} guildID The ID of the guild
     * @param {String} integrationID The ID of the integration
     * @returns {Promise}
     */
    deleteGuildIntegration(guildID, integrationID) {
        return this.requestHandler.request("DELETE", Endpoints.GUILD_INTEGRATION(guildID, integrationID), true);
    }

    /**
     * Delete a guild scheduled event
     * @param {String} guildID The ID of the guild
     * @param {String} eventID The ID of the event
     * @returns {Promise}
     */
    deleteGuildScheduledEvent(guildID, eventID) {
        return this.requestHandler.request("DELETE", Endpoints.GUILD_SCHEDULED_EVENT(guildID, eventID), true);
    }

    /**
     * Delete a guild sticker
     * @param {String} guildID The ID of the guild
     * @param {String} stickerID The ID of the sticker
     * @param {String} [reason] The reason to be displayed in audit logs
     * @returns {Promise}
     */
    deleteGuildSticker(guildID, stickerID, reason) {
        return this.requestHandler.request("DELETE", Endpoints.GUILD_STICKER(guildID, stickerID), true, {
            reason
        });
    }

    /**
     * Delete a guild template
     * @param {String} guildID The ID of the guild
     * @param {String} code The template code
     * @returns {Promise<GuildTemplate>}
     */
    deleteGuildTemplate(guildID, code) {
        return this.requestHandler.request("DELETE", Endpoints.GUILD_TEMPLATE_GUILD(guildID, code), true).then((template) => new GuildTemplate(template, this));
    }

    /**
     * Delete an invite
     * @param {String} inviteID The ID of the invite
     * @param {String} [reason] The reason to be displayed in audit logs
     * @returns {Promise}
     */
    deleteInvite(inviteID, reason) {
        return this.requestHandler.request("DELETE", Endpoints.INVITE(inviteID), true, {
            reason
        });
    }

    /**
     * Delete a message
     * @param {String} channelID The ID of the channel
     * @param {String} messageID The ID of the message
     * @param {String} [reason] The reason to be displayed in audit logs
     * @returns {Promise}
     */
    deleteMessage(channelID, messageID, reason) {
        return this.requestHandler.request("DELETE", Endpoints.CHANNEL_MESSAGE(channelID, messageID), true, {
            reason
        });
    }

    /**
     * Bulk delete messages
     * @param {String} channelID The ID of the channel
     * @param {Array<String>} messageIDs Array of message IDs to delete
     * @param {String} [reason] The reason to be displayed in audit logs
     * @returns {Promise}
     */
    deleteMessages(channelID, messageIDs, reason) {
        if(messageIDs.length === 0) {
            return Promise.resolve();
        }
        if(messageIDs.length === 1) {
            return this.deleteMessage(channelID, messageIDs[0], reason);
        }

        const oldestAllowedSnowflake = (Date.now() - 1421280000000) * 4194304;
        const invalidMessage = messageIDs.find((messageID) => messageID < oldestAllowedSnowflake);
        if(invalidMessage) {
            return Promise.reject(new Error(`Message ${invalidMessage} is more than 2 weeks old.`));
        }

        if(messageIDs.length > 100) {
            return this.requestHandler.request("POST", Endpoints.CHANNEL_BULK_DELETE(channelID), true, {
                messages: messageIDs.splice(0, 100),
                reason: reason
            }).then(() => this.deleteMessages(channelID, messageIDs, reason));
        }
        return this.requestHandler.request("POST", Endpoints.CHANNEL_BULK_DELETE(channelID), true, {
            messages: messageIDs,
            reason: reason
        });
    }

    /**
     * Delete a guild role
     * @param {String} guildID The ID of the guild to create the role in
     * @param {String} roleID The ID of the role
     * @param {String} [reason] The reason to be displayed in audit logs
     * @returns {Promise}
     */
    deleteRole(guildID, roleID, reason) {
        return this.requestHandler.request("DELETE", Endpoints.GUILD_ROLE(guildID, roleID), true, {
            reason
        });
    }

    /**
     * Delete a stage instance
     * @param {String} channelID The stage channel associated with the instance
     * @returns {Promise}
     */
    deleteStageInstance(channelID) {
        return this.requestHandler.request("DELETE", Endpoints.STAGE_INSTANCE(channelID), true);
    }

    /**
     * Deletes a testing entitlement
     * @param {String} entitlementID The test entitlement ID to remove
     * @returns {Promise}
     */
    deleteTestEntitlement(entitlementID) {
        return this.requestHandler.request("DELETE", Endpoints.ENTITLEMENT(this.application.id, entitlementID), true);
    }

    /**
     * Delete a webhook
     * @param {String} webhookID The ID of the webhook
     * @param {String} [token] The token of the webhook, used instead of the Bot Authorization token
     * @param {String} [reason] The reason to be displayed in audit logs
     * @returns {Promise}
     */
    deleteWebhook(webhookID, token, reason) {
        return this.requestHandler.request("DELETE", token ? Endpoints.WEBHOOK_TOKEN(webhookID, token) : Endpoints.WEBHOOK(webhookID), !token, {
            reason
        });
    }

    /**
     * Delete a webhook message
     * @param {String} webhookID The ID of the webhook
     * @param {String} token The token of the webhook
     * @param {String} messageID The ID of the message
     * @param {String} [threadID] The ID of the thread channel if the message is in a thread
     * @returns {Promise}
     */
    deleteWebhookMessage(webhookID, token, messageID, threadID) {
        return this.requestHandler.request("DELETE", Endpoints.WEBHOOK_MESSAGE(webhookID, token, messageID), false, {
            thread_id: threadID
        });
    }

    /**
     * Disconnects all shards
     * @param {Object?} [options] Shard disconnect options
     * @param {String | Boolean} [options.reconnect] false means destroy everything, true means you want to reconnect in the future, "auto" will autoreconnect
     */
    disconnect(options) {
        this.ready = false;
        this.shards.forEach((shard) => {
            shard.disconnect(options);
        });
        this.shards.connectQueue = [];
    }

    /**
     * Update the bot's AFK status. Setting this to true will enable push notifications for userbots.
     * @param {Boolean} afk Whether the bot user is AFK or not
     */
    editAFK(afk) {
        this.presence.afk = !!afk;

        this.shards.forEach((shard) => {
            shard.editAFK(afk);
        });
    }

    /**
     * Edits the application associated with this bot user
     * @param {Object} options The new application options. See [Discord's documentation](https://discord.com/developers/docs/resources/application#edit-current-application-json-params) for a list of them
     * @returns {Promise<Object>}
     */
    editApplication(options) {
        return this.requestHandler.request("PATCH", Endpoints.APPLICATION, options);
    }

    /**
     * Edit an application emoji object
     * @param {String} emojiID The ID of the emoji you want to modify
     * @param {Object} options Emoji options
     * @param {String} [options.name] The name of emoji
     * @returns {Promise<Object>} An application emoji object
     */
    editApplicationEmoji(emojiID, options) {
        return this.requestHandler.request("PATCH", Endpoints.APPLICATION_EMOJI(this.application.id, emojiID), true, options);
    }

    /**
     * Gets an application emoji for the current application
     * @param {String} emojiID The ID of the emoji
     * @returns {Promise<Object>} An emoji object with creator data
     */
    getApplicationEmoji(emojiID) {
        return this.requestHandler.request("GET", Endpoints.APPLICATION_EMOJI(this.application.id, emojiID), true);
    }

    /**
     * Gets a list of emojis for the current application
     * @returns {Promise<Object[]>} An array of emoji objects with creator data
     */
    getApplicationEmojis() {
        return this.requestHandler.request("GET", Endpoints.APPLICATION_EMOJIS(this.application.id), true);
    }

    /**
     * Get all archived threads in a channel
     * @param {String} channelID The ID of the channel
     * @param {String} type The type of thread channel, either "public" or "private"
     * @param {Object} [options] Additional options when requesting archived threads
     * @param {Date} [options.before] List of threads to return before the timestamp
     * @param {Number} [options.limit] Maximum number of threads to return
     * @returns {Promise<Object>} An object containing an array of `threads`, an array of `members` and whether the response `hasMore` threads that could be returned in a subsequent call
     */
    getArchivedThreads(channelID, type, options = {}) {
        return this.requestHandler.request("GET", Endpoints.THREADS_ARCHIVED(channelID, type), true, options).then((response) => {
            return {
                hasMore: response.has_more,
                members: response.members.map((member) => new ThreadMember(member, this)),
                threads: response.threads.map((thread) => Channel.from(thread, this))
            };
        });
    }

    /**
     * Get an existing auto moderation rule
     * @param {String} guildID The ID of the guild to get the rule from
     * @param {String} ruleID The ID of the rule to get
     * @returns {Promise<AutoModerationRule>}
     */
    getAutoModerationRule(guildID, ruleID) {
        return this.requestHandler.request("GET", Endpoints.AUTO_MODERATION_RULE(guildID, ruleID), true).then((rule) => new AutoModerationRule(rule, this));
    }

    /**
     * Get a guild's auto moderation rules
     * @param {String} guildID The ID of the guild to get the rules of
     * @returns {Promise<Object[]>}
     */
    getAutoModerationRules(guildID) {
        return this.requestHandler.request("GET", Endpoints.AUTO_MODERATION_RULES(guildID), true).then((rules) => rules.map((rule) => new AutoModerationRule(rule, this)));
    }

    /**
     * Get general and bot-specific info on connecting to the Discord gateway (e.g. connection ratelimit)
     * @returns {Promise<Object>} Resolves with an object containing gateway connection info
     */
    getBotGateway() {
        return this.requestHandler.request("GET", Endpoints.GATEWAY_BOT, true);
    }

    /**
     * Get a Channel object from a channel ID
     * @param {String} channelID The ID of the channel
     * @returns {CategoryChannel | PrivateChannel | TextChannel | TextVoiceChannel | NewsChannel | NewsThreadChannel | PrivateThreadChannel | PublicThreadChannel}
     */
    getChannel(channelID) {
        if(!channelID) {
            throw new Error(`Invalid channel ID: ${channelID}`);
        }

        if(this.channelGuildMap[channelID] && this.guilds.get(this.channelGuildMap[channelID])) {
            return this.guilds.get(this.channelGuildMap[channelID]).channels.get(channelID);
        }
        if(this.threadGuildMap[channelID] && this.guilds.get(this.threadGuildMap[channelID])) {
            return this.guilds.get(this.threadGuildMap[channelID]).threads.get(channelID);
        }
        return this.privateChannels.get(channelID);
    }

    /**
     * Get all invites in a channel
     * @param {String} channelID The ID of the channel
     * @returns {Promise<Array<Invite>>}
     */
    getChannelInvites(channelID) {
        return this.requestHandler.request("GET", Endpoints.CHANNEL_INVITES(channelID), true).then((invites) => invites.map((invite) => new Invite(invite, this)));
    }

    /**
     * Get all the webhooks in a channel
     * @param {String} channelID The ID of the channel to get webhooks for
     * @returns {Promise<Array<Object>>} Resolves with an array of webhook objects
     */
    getChannelWebhooks(channelID) {
        return this.requestHandler.request("GET", Endpoints.CHANNEL_WEBHOOKS(channelID), true);
    }

    /**
     * Get a global application command
     * @param {String} commandID The command id
     * @param {Boolean} [withLocalizations] Include [localizations](https://discord.com/developers/docs/interactions/application-commands#retrieving-localized-commands) in the response
     * @returns {Promise<ApplicationCommand>}
     */
    getCommand(commandID, withLocalizations) {
        let qs = "";
        if(withLocalizations) {
            qs += "&with_localizations=true";
        }
        return this.requestHandler.request("GET", Endpoints.COMMAND(this.application.id, commandID) + (qs ? "?" + qs : ""), true).then((applicationCommand) => new ApplicationCommand(applicationCommand, this));
    }

    /**
     * Get the a guild's application command permissions
     * @param {String} guildID The guild ID
     * @param {String} commandID The command id
     * @returns {Promise<Object>} Resolves with a guild application command permissions object.
     */
    getCommandPermissions(guildID, commandID) {
        return this.requestHandler.request("GET", Endpoints.COMMAND_PERMISSIONS(this.application.id, guildID, commandID), true);
    }

    /**
     * Get the global application commands
     * @param {Boolean} [withLocalizations] Include [localizations](https://discord.com/developers/docs/interactions/application-commands#retrieving-localized-commands) in the response
     * @returns {Promise<ApplicationCommand[]>}
     */
    getCommands(withLocalizations) {
        let qs = "";
        if(withLocalizations) {
            qs += "&with_localizations=true";
        }
        return this.requestHandler.request("GET", Endpoints.COMMANDS(this.application.id) + (qs ? "?" + qs : ""), true).then((applicationCommands) => applicationCommands.map((applicationCommand) => new ApplicationCommand(applicationCommand, this)));
    }

    /**
     * Get a DM channel with a user, or create one if it does not exist
     * @param {String} userID The ID of the user
     * @returns {Promise<PrivateChannel>}
     */
    getDMChannel(userID) {
        if(this.privateChannelMap[userID]) {
            return Promise.resolve(this.privateChannels.get(this.privateChannelMap[userID]));
        }
        return this.requestHandler.request("POST", Endpoints.USER_CHANNELS("@me"), true, {
            recipient_id: userID
        }).then((privateChannel) => new PrivateChannel(privateChannel, this));
    }

    /**
     * Gets a list of entitlements for this application
     * @param {Object} [options] THe options for the request
     * @param {String} [options.userID] The user ID to look entitlements up for
     * @param {Array<String>} [options.skuIDs] The SKU IDs to look entitlements up for
     * @param {Number} [options.before] Look entitlements up before this ID
     * @param {Number} [options.after] Look entitlements up after this ID
     * @param {Number} [options.limit=100] The amount of entitlements to retrieve (1-100)
     * @param {String} [options.guildID] The guild ID to look entitlements up for
     * @param {Boolean} [options.excludeEnded] Whether to omit already expired entitlements or not
     * @returns {Promise<Array<Entitlement>>}
     */
    getEntitlements(options = {}) {
        options.user_id = options.userID;
        options.sku_ids = options.skuIDs;
        options.guild_id = options.guildID;
        options.exclude_ended = options.excludeEnded;
        return this.requestHandler.request("GET", Endpoints.ENTITLEMENTS(this.application.id), true, options).then((entitlements) => entitlements.map((entitlement) => new Entitlement(entitlement, this)));
    }

    /**
     * Get info on connecting to the Discord gateway
     * @returns {Promise<Object>} Resolves with an object containing gateway connection info
     */
    getGateway() {
        return this.requestHandler.request("GET", Endpoints.GATEWAY);
    }

    /**
     * Get the audit log for a guild
     * @param {String} guildID The ID of the guild to get audit logs for
     * @param {Object} [options] Options for the request
     * @param {Number} [options.actionType] Filter entries by action type
     * @param {String} [options.after] Get entries after this entry ID
     * @param {String} [options.before] Get entries before this entry ID
     * @param {Number} [options.limit=50] The maximum number of entries to return
     * @param {String} [options.userID] Filter entries by the user that performed the action
     * @returns {Promise<{autoModerationRules: Array<AutoModerationRule>, commands: Array<ApplicationCommand>, entries: Array<GuildAuditLogEntry>, events: Array<GuildScheduledEvent>, integrations: Array<PartialIntegration>, threads: Array<NewsThreadChannel | PrivateThreadChannel | PublicThreadChannel>, users: Array<User>, webhooks: Array<Webhook>}>}
     */
    getGuildAuditLog(guildID, options = {}) {
        options.limit ??= 50; // Legacy behavior
        if(options.actionType !== undefined) {
            options.action_type = options.actionType;
        }
        if(options.userID !== undefined) {
            options.user_id = options.userID;
        }
        return this.requestHandler.request("GET", Endpoints.GUILD_AUDIT_LOGS(guildID), true, options).then((data) => {
            const guild = this.guilds.get(guildID);
            const users = data.users.map((user) => this.users.add(user, this));
            const threads = data.threads.map((thread) => guild.threads.update(thread, this));
            const events = data.guild_scheduled_events.map((event) => guild.events.update(event, this));
            const commands = data.application_commands.map((cmd) => new ApplicationCommand(cmd, this));
            const autoModerationRules = data.auto_moderation_rules.map((rule) => new AutoModerationRule(rule, this));

            return {
                autoModerationRules: autoModerationRules,
                commands: commands,
                entries: data.audit_log_entries.map((entry) => new GuildAuditLogEntry(entry, guild)),
                events: events,
                integrations: data.integrations.map((integration) => new GuildIntegration(integration, guild)),
                threads: threads,
                users: users,
                webhooks: data.webhooks
            };
        });
    }

    /**
     * Get a ban from the ban list of a guild
     * @param {String} guildID The ID of the guild
     * @param {String} userID The ID of the banned user
     * @returns {Promise<Object>} Resolves with {reason: String, user: User}
     */
    getGuildBan(guildID, userID) {
        return this.requestHandler.request("GET", Endpoints.GUILD_BAN(guildID, userID), true).then((ban) => {
            ban.user = new User(ban.user, this);
            return ban;
        });
    }

    /**
     * Get the ban list of a guild
     * @param {String} guildID The ID of the guild
     * @param {Object} [options] Options for the request
     * @param {String} [options.after] Only get users after given user ID
     * @param {String} [options.before] Only get users before given user ID
     * @param {Number} [options.limit=1000] The maximum number of users to return
     * @returns {Promise<Array<Object>>} Resolves with an array of { reason: String, user: User }
     */
    async getGuildBans(guildID, options = {}) {
        const bans = await this.requestHandler.request("GET", Endpoints.GUILD_BANS(guildID), true, {
            after: options.after,
            before: options.before,
            limit: options.limit && Math.min(options.limit, 1000)
        });

        for(const ban of bans) {
            ban.user = this.users.update(ban.user, this);
        }

        if(options.limit && options.limit > 1000 && bans.length >= 1000) {
            const page = await this.getGuildBans(guildID, {
                after: options.before ? undefined : bans[bans.length - 1].user.id,
                before: options.before ? bans[0].user.id : undefined,
                limit: options.limit - bans.length
            });

            if(options.before) {
                bans.unshift(...page);
            } else {
                bans.push(...page);
            }
        }

        return bans;
    }

    /**
     * Get a guild application command
     * @param {String} guildID The guild ID
     * @param {String} commandID The command id
     * @param {Boolean} [withLocalizations] Include [localizations](https://discord.com/developers/docs/interactions/application-commands#retrieving-localized-commands) in the response
     * @returns {Promise<ApplicationCommand>} Resolves with an command object.
     */
    getGuildCommand(guildID, commandID, withLocalizations) {
        let qs = "";
        if(withLocalizations) {
            qs += "&with_localizations=true";
        }
        return this.requestHandler.request("GET", Endpoints.GUILD_COMMAND(this.application.id, guildID, commandID) + (qs ? "?" + qs : ""), true).then((applicationCommand) => new ApplicationCommand(applicationCommand, this));
    }

    /**
     * Get the all of a guild's application command permissions
     * @param {String} guildID The guild ID
     * @returns {Promise<Array<Object>>} Resolves with an array of guild application command permissions objects.
     */
    getGuildCommandPermissions(guildID) {
        return this.requestHandler.request("GET", Endpoints.GUILD_COMMAND_PERMISSIONS(this.application.id, guildID), true);
    }

    /**
     * Get a guild's application commands
     * @param {String} guildID The guild id
     * @param {Boolean} [withLocalizations] Include [localizations](https://discord.com/developers/docs/interactions/application-commands#retrieving-localized-commands) in the response
     * @returns {Promise<ApplicationCommand[]>} Resolves with an array of command objects.
     */
    getGuildCommands(guildID, withLocalizations) {
        let qs = "";
        if(withLocalizations) {
            qs += "&with_localizations=true";
        }
        return this.requestHandler.request("GET", Endpoints.GUILD_COMMANDS(this.application.id, guildID) + (qs ? "?" + qs : ""), true).then((applicationCommands) => applicationCommands.map((applicationCommand) => new ApplicationCommand(applicationCommand, this)));
    }

    /**
     * Get a list of integrations for a guild
     * @param {String} guildID The ID of the guild
     * @returns {Promise<Array<GuildIntegration>>}
     */
    getGuildIntegrations(guildID) {
        const guild = this.guilds.get(guildID);
        return this.requestHandler.request("GET", Endpoints.GUILD_INTEGRATIONS(guildID), true).then((integrations) => integrations.map((integration) => new GuildIntegration(integration, guild)));
    }

    /**
     * Get all invites in a guild
     * @param {String} guildID The ID of the guild
     * @returns {Promise<Array<Invite>>}
     */
    getGuildInvites(guildID) {
        return this.requestHandler.request("GET", Endpoints.GUILD_INVITES(guildID), true).then((invites) => invites.map((invite) => new Invite(invite, this)));
    }

    /**
     * Get the onboarding flow of a guild, shown to new members
     * @param {String} guildID The ID of the guild
     * @returns {Promise<Object>} Resolves with the [guild onboarding object](https://discord.com/developers/docs/resources/guild#guild-onboarding-object)
     */
    getGuildOnboarding(guildID) {
        return this.requestHandler.request("GET", Endpoints.GUILD_ONBOARDING(guildID), true);
    }

    /**
     * Get a guild preview for a guild. Only available for community guilds.
     * @param {String} guildID The ID of the guild
     * @returns {Promise<GuildPreview>}
     */
    getGuildPreview(guildID) {
        return this.requestHandler.request("GET", Endpoints.GUILD_PREVIEW(guildID), true).then((data) => new GuildPreview(data, this));
    }

    /**
     * Get a guild's scheduled events
     * @param {String} guildID The ID of the guild
     * @param {Object} [options] Options for the request
     * @param {Boolean} [options.withUserCount] Whether to include the number of users subscribed to each event
     * @returns {Promise<Array<GuildScheduledEvent>>}
     */
    getGuildScheduledEvents(guildID, options = {}) {
        options.with_user_count = options.withUserCount;
        return this.requestHandler.request("GET", Endpoints.GUILD_SCHEDULED_EVENTS(guildID), true, options).then((data) => data.map((event) => new GuildScheduledEvent(event, this)));
    }

    /**
     * Get a list of users subscribed to a guild scheduled event
     * @param {String} guildID The ID of the guild
     * @param {String} eventID The ID of the event
     * @param {Object} [options] Options for the request
     * @param {String} [options.after] Get users after this user ID. If `options.before` is provided, this will be ignored. Fetching users in between `before` and `after` is not supported
     * @param {String} [options.before] Get users before this user ID
     * @param {Number} [options.limit=100] The number of users to get (max 100). Pagination will only work if one of `options.after` or `options.after` is also provided
     * @param {Boolean} [options.withMember] Include guild member data
     * @returns {Promise<Array<{guildScheduledEventID: String, member: Member | undefined, user: User}>>}
     */
    getGuildScheduledEventUsers(guildID, eventID, options = {}) {
        const guild = this.guilds.get(guildID);

        options.with_member = options.withMember;
        return this.requestHandler.request("GET", Endpoints.GUILD_SCHEDULED_EVENT_USERS(guildID, eventID), true, options).then((data) => data.map((eventUser) => {
            if(eventUser.member) {
                eventUser.member.id = eventUser.user.id;
            }
            return {
                guildScheduledEventID: eventUser.guild_scheduled_event_id,
                member: eventUser.member && guild ? guild.members.update(eventUser.member) : new Member(eventUser.member),
                user: this.users.update(eventUser.user)
            };
        }));
    }

    /**
     * Get a guild template
     * @param {String} code The template code
     * @returns {Promise<GuildTemplate>}
     */
    getGuildTemplate(code) {
        return this.requestHandler.request("GET", Endpoints.GUILD_TEMPLATE(code), true).then((template) => new GuildTemplate(template, this));
    }

    /**
     * Get a guild's templates
     * @param {String} guildID The ID of the guild
     * @returns {Promise<Array<GuildTemplate>>}
     */
    getGuildTemplates(guildID) {
        return this.requestHandler.request("GET", Endpoints.GUILD_TEMPLATES(guildID), true).then((templates) => templates.map((t) => new GuildTemplate(t, this)));
    }

    /**
     * Returns the vanity url of the guild
     * @param {String} guildID The ID of the guild
     * @returns {Promise}
     */
    getGuildVanity(guildID) {
        return this.requestHandler.request("GET", Endpoints.GUILD_VANITY_URL(guildID), true);
    }

    /**
     * Get all the webhooks in a guild
     * @param {String} guildID The ID of the guild to get webhooks for
     * @returns {Promise<Array<Object>>} Resolves with an array of webhook objects
     */
    getGuildWebhooks(guildID) {
        return this.requestHandler.request("GET", Endpoints.GUILD_WEBHOOKS(guildID), true);
    }

    /**
     * Get the welcome screen of a Community guild, shown to new members
     * @param {String} guildID The ID of the guild to get the welcome screen for
     * @returns {Promise<Object>}
     */
    getGuildWelcomeScreen(guildID) {
        return this.requestHandler.request("GET", Endpoints.GUILD_WELCOME_SCREEN(guildID), true);
    }

    /**
     * Get a guild's widget object
     * @param {String} guildID The ID of the guild
     * @returns {Promise<Object>} A guild widget object
     */
    getGuildWidget(guildID) {
        return this.requestHandler.request("GET", Endpoints.GUILD_WIDGET(guildID), true);
    }

    /**
     * Get a guild's widget settings object. Requires MANAGE_GUILD permission
     * @param {String} guildID The ID of the guild
     * @returns {Promise<Object>} A guild widget setting object
     */
    getGuildWidgetSettings(guildID) {
        return this.requestHandler.request("GET", Endpoints.GUILD_WIDGET_SETTINGS(guildID), true);
    }

    /**
     * Get info on an invite
     * @param {String} inviteID The ID of the invite
     * @param {Object | Boolean} [options] Options for fetching the invite.
     * @param {Boolean} [options.withCounts] Whether to fetch additional invite info or not (approximate member counts, approximate presences, channel counts, etc.)
     * @param {Boolean} [options.withExpiration] Whether to fetch the expiration time or not
     * @param {String} [options.guildScheduledEventID] The guild scheduled event ID to include along with the invite
     * @returns {Promise<Invite>}
     */
    getInvite(inviteID, options = {}) {
        options.with_counts = options.withCounts;
        options.with_expiration = options.withExpiration;
        options.guild_scheduled_event_id = options.guildScheduledEventID;
        return this.requestHandler.request("GET", Endpoints.INVITE(inviteID), true, options).then((invite) => new Invite(invite, this));
    }

    /**
     * Get joined private archived threads in a channel
     * @param {String} channelID The ID of the channel
     * @param {Object} [options] Additional options when requesting archived threads
     * @param {Date} [options.before] List of threads to return before the timestamp
     * @param {Number} [options.limit] Maximum number of threads to return
     * @returns {Promise<Object>} An object containing an array of `threads`, an array of `members` and whether the response `hasMore` threads that could be returned in a subsequent call
     */
    getJoinedPrivateArchivedThreads(channelID, options = {}) {
        return this.requestHandler.request("GET", Endpoints.THREADS_ARCHIVED_JOINED(channelID), true, options).then((response) => {
            return {
                hasMore: response.has_more,
                members: response.members.map((member) => new ThreadMember(member, this)),
                threads: response.threads.map((thread) => Channel.from(thread, this))
            };
        });
    }

    /**
     * Get a previous message in a channel
     * @param {String} channelID The ID of the channel
     * @param {String} messageID The ID of the message
     * @returns {Promise<Message>}
     */
    getMessage(channelID, messageID) {
        return this.requestHandler.request("GET", Endpoints.CHANNEL_MESSAGE(channelID, messageID), true).then((message) => new Message(message, this));
    }

    /**
     * Get a list of users who reacted with a specific reaction
     * @param {String} channelID The ID of the channel
     * @param {String} messageID The ID of the message
     * @param {String} reaction The reaction (Unicode string if Unicode emoji, `emojiName:emojiID` if custom emoji)
     * @param {Object} [options] Options for the request
     * @param {Number} [options.limit=100] The maximum number of users to get
     * @param {String} [options.after] Get users after this user ID
     * @param {Number} [options.type=0] The type of reaction to get
     * @returns {Promise<Array<User>>}
     */
    getMessageReaction(channelID, messageID, reaction, options = {}) {
        if(reaction === decodeURI(reaction)) {
            reaction = encodeURIComponent(reaction);
        }
        options.limit ??= 100; // Legacy behavior
        return this.requestHandler.request("GET", Endpoints.CHANNEL_MESSAGE_REACTION(channelID, messageID, reaction), true, options).then((users) => users.map((user) => new User(user, this)));
    }

    /**
     * Get previous messages in a channel
     * @param {String} channelID The ID of the channel
     * @param {Object} [options] Options for the request.
     * @param {String} [options.after] Get messages after this message ID
     * @param {String} [options.around] Get messages around this message ID (does not work with limit > 100)
     * @param {String} [options.before] Get messages before this message ID
     * @param {Number} [options.limit=50] The max number of messages to get
     * @returns {Promise<Array<Message>>}
     */
    async getMessages(channelID, options = {}) {
        options.limit ??= 50; // Legacy behavior
        let limit = options.limit;
        if(limit && limit > 100) {
            let logs = [];
            const get = async (_before, _after) => {
                const messages = await this.requestHandler.request("GET", Endpoints.CHANNEL_MESSAGES(channelID), true, {
                    limit: 100,
                    before: _before || undefined,
                    after: _after || undefined
                });
                if(limit <= messages.length) {
                    return (_after ? messages.slice(messages.length - limit, messages.length).map((message) => new Message(message, this)).concat(logs) : logs.concat(messages.slice(0, limit).map((message) => new Message(message, this))));
                }
                limit -= messages.length;
                logs = (_after ? messages.map((message) => new Message(message, this)).concat(logs) : logs.concat(messages.map((message) => new Message(message, this))));
                if(messages.length < 100) {
                    return logs;
                }
                this.emit("debug", `Getting ${limit} more messages during getMessages for ${channelID}: ${_before} ${_after}`, -1);
                return get((_before || !_after) && messages[messages.length - 1].id, _after && messages[0].id);
            };
            return get(options.before, options.after);
        }
        const messages = await this.requestHandler.request("GET", Endpoints.CHANNEL_MESSAGES(channelID), true, options);
        return messages.map((message) => {
            try {
                return new Message(message, this);
            } catch(err) {
                this.emit("error", `Error creating message from channel messages\n${err.stack}\n${JSON.stringify(messages)}`);
                return null;
            }
        });
    }

    /**
     * [DEPRECATED] Get the list of sticker packs available to Nitro subscribers
     * @returns {Promise<Object>} An object which contains a value which contains an array of sticker packs
     */
    getNitroStickerPacks() {
        emitDeprecation("NITRO_STICKER_PACKS");
        return this.getStickerPacks();
    }

    /**
     * Get data on the bot's OAuth2 application. See also `getApplication()` for more info.
     * @returns {Promise<Object>} The bot's application data. Refer to [Discord's Documentation](https://discord.com/developers/docs/resources/application#application-object) for object structure
     */
    getOAuthApplication() {
        return this.requestHandler.request("GET", Endpoints.OAUTH2_APPLICATION, true);
    }

    /**
     * Get all the pins in a channel
     * @param {String} channelID The ID of the channel
     * @returns {Promise<Array<Message>>}
     */
    getPins(channelID) {
        return this.requestHandler.request("GET", Endpoints.CHANNEL_PINS(channelID), true).then((messages) => messages.map((message) => new Message(message, this)));
    }

    /**
     * Gets a list of users that voted for an answer in a poll
     * @param {String} channelID The ID of the channel the poll is in
     * @param {String} messageID The ID of the message containing the poll
     * @param {Number} answerID The ID of the answer
     * @param {Object} [options] Options for fetching the answer list
     * @param {String} [options.after] Get users after this user ID
     * @param {Number} [options.limit=100] The maximum number of users to get
     * @returns {Promise<Array<User>>}
     */
    getPollAnswerVoters(channelID, messageID, answerID, options = {}) {
        return this.requestHandler.request("GET", Endpoints.CHANNEL_POLL_ANSWERS(channelID, messageID, answerID), true, options).then((data) => data.users.map((user) => new User(user, this)));
    }

    /**
     * Get the prune count for a guild
     * @param {String} guildID The ID of the guild
     * @param {Number} [options] The options to use to get number of prune members
     * @param {Number} [options.days=7] The number of days of inactivity to prune for
     * @param {Array<String>} [options.includeRoles] An array of role IDs that members must have to be considered for pruning
     * @returns {Promise<Number>} Resolves with the number of members that would be pruned
     */
    getPruneCount(guildID, options = {}) {
        return this.requestHandler.request("GET", Endpoints.GUILD_PRUNE(guildID), true, {
            days: options.days,
            include_roles: options.includeRoles
        }).then((data) => data.pruned);
    }

    /**
     * Get a channel's data via the REST API. REST mode is required to use this endpoint.
     * @param {String} channelID The ID of the channel
     * @returns {Promise<CategoryChannel | PrivateChannel | TextChannel | TextVoiceChannel | NewsChannel | NewsThreadChannel | PrivateThreadChannel | PublicThreadChannel>}
     */
    getRESTChannel(channelID) {
        if(!this.options.restMode) {
            return Promise.reject(new Error("Dysnomia REST mode is not enabled"));
        }
        return this.requestHandler.request("GET", Endpoints.CHANNEL(channelID), true)
            .then((channel) => Channel.from(channel, this));
    }

    /**
     * Get a guild's data via the REST API. REST mode is required to use this endpoint.
     * @param {String} guildID The ID of the guild
     * @param {Boolean} [withCounts=false] Whether the guild object will have approximateMemberCount and approximatePresenceCount
     * @returns {Promise<Guild>}
     */
    getRESTGuild(guildID, withCounts = false) {
        if(!this.options.restMode) {
            return Promise.reject(new Error("Dysnomia REST mode is not enabled"));
        }
        return this.requestHandler.request("GET", Endpoints.GUILD(guildID), true, {
            with_counts: withCounts
        }).then((guild) => new Guild(guild, this));
    }

    /**
     * Get a guild's channels via the REST API. REST mode is required to use this endpoint.
     * @param {String} guildID The ID of the guild
     * @returns {Promise<Array<CategoryChannel | TextChannel | TextVoiceChannel | NewsChannel | StageChannel>>}
     */
    getRESTGuildChannels(guildID) {
        if(!this.options.restMode) {
            return Promise.reject(new Error("Dysnomia REST mode is not enabled"));
        }
        return this.requestHandler.request("GET", Endpoints.GUILD_CHANNELS(guildID), true)
            .then((channels) => channels.map((channel) => Channel.from(channel, this)));
    }

    /**
     * Get a guild emoji via the REST API. REST mode is required to use this endpoint.
     * @param {String} guildID The ID of the guild
     * @param {String} emojiID The ID of the emoji
     * @returns {Promise<Object>} An emoji object
     */
    getRESTGuildEmoji(guildID, emojiID) {
        if(!this.options.restMode) {
            return Promise.reject(new Error("Dysnomia REST mode is not enabled"));
        }
        return this.requestHandler.request("GET", Endpoints.GUILD_EMOJI(guildID, emojiID), true);
    }

    /**
     * Get a guild's emojis via the REST API. REST mode is required to use this endpoint.
     * @param {String} guildID The ID of the guild
     * @returns {Promise<Array<Object>>} An array of guild emoji objects
     */
    getRESTGuildEmojis(guildID) {
        if(!this.options.restMode) {
            return Promise.reject(new Error("Dysnomia REST mode is not enabled"));
        }
        return this.requestHandler.request("GET", Endpoints.GUILD_EMOJIS(guildID), true);
    }

    /**
     * Get a guild's members via the REST API. REST mode is required to use this endpoint.
     * @param {String} guildID The ID of the guild
     * @param {String} memberID The ID of the member
     * @returns {Promise<Member>}
     */
    getRESTGuildMember(guildID, memberID) {
        if(!this.options.restMode) {
            return Promise.reject(new Error("Dysnomia REST mode is not enabled"));
        }
        return this.requestHandler.request("GET", Endpoints.GUILD_MEMBER(guildID, memberID), true).then((member) => new Member(member, this.guilds.get(guildID), this));
    }

    /**
     * Get a guild's members via the REST API. REST mode is required to use this endpoint.
     * @param {String} guildID The ID of the guild
     * @param {Object} [options] Options for the request.
     * @param {String} [options.after] The highest user ID of the previous page
     * @param {Number} [options.limit=1] The max number of members to get (1 to 1000)
     * @returns {Promise<Array<Member>>}
     */
    getRESTGuildMembers(guildID, options = {}) {
        if(!this.options.restMode) {
            return Promise.reject(new Error("Dysnomia REST mode is not enabled"));
        }
        return this.requestHandler.request("GET", Endpoints.GUILD_MEMBERS(guildID), true, options).then((members) => members.map((member) => new Member(member, this.guilds.get(guildID), this)));
    }

    /**
     * Get a guild role via the REST API. REST mode is required to use this endpoint.
     * @param {String} guildID The ID of the guild
     * @param {String} roleID The ID of the role
     * @returns {Promise<Array<Role>>}
     */
    getRESTGuildRole(guildID, roleID) {
        if(!this.options.restMode) {
            return Promise.reject(new Error("Dysnomia REST mode is not enabled"));
        }
        return this.requestHandler.request("GET", Endpoints.GUILD_ROLE(guildID, roleID), true).then((role) => new Role(role, null));
    }

    /**
     * Get a guild's roles via the REST API. REST mode is required to use this endpoint.
     * @param {String} guildID The ID of the guild
     * @returns {Promise<Array<Role>>}
     */
    getRESTGuildRoles(guildID) {
        if(!this.options.restMode) {
            return Promise.reject(new Error("Dysnomia REST mode is not enabled"));
        }
        return this.requestHandler.request("GET", Endpoints.GUILD_ROLES(guildID), true).then((roles) => roles.map((role) => new Role(role, null)));
    }

    /**
     * Get a list of the user's guilds via the REST API. REST mode is required to use this endpoint.
     * @param {Object} [options] Options for the request.
     * @param {String} [options.after] The highest guild ID of the previous page
     * @param {String} [options.before] The lowest guild ID of the next page
     * @param {Number} [options.limit=200] The max number of guilds to get (1 to 200)
     * @param {Boolean} [options.withCounts] Whether the guild objects will have approximateMemberCount and approximatePresenceCount
     * @returns {Promise<Array<Guild>>}
     */
    getRESTGuilds(options = {}) {
        // TODO type
        if(!this.options.restMode) {
            return Promise.reject(new Error("Dysnomia REST mode is not enabled"));
        }
        options.with_counts = options.withCounts;
        return this.requestHandler.request("GET", Endpoints.USER_GUILDS("@me"), true, options).then((guilds) => guilds.map((guild) => new Guild(guild, this)));
    }

    /**
     * Get a guild scheduled event via the REST API. REST mode is required to use this endpoint.
     * @param {String} guildID The ID of the guild
     * @param {String} eventID The ID of the guild scheduled event
     * @param {Object} [options] Options for the request
     * @param {Boolean} [options.withUserCount] Whether to include the number of users subscribed to the event
     * @returns {Promise<GuildScheduledEvent>}
     */
    getRESTGuildScheduledEvent(guildID, eventID, options = {}) {
        if(!this.options.restMode) {
            return Promise.reject(new Error("Dysnomia REST mode is not enabled"));
        }

        options.with_user_count = options.withUserCount;
        return this.requestHandler.request("GET", Endpoints.GUILD_SCHEDULED_EVENT(guildID, eventID), true, options).then((data) => new GuildScheduledEvent(data, this));
    }

    /**
     * Get a guild sticker via the REST API. REST mode is required to use this endpoint.
     * @param {String} guildID The ID of the guild
     * @param {String} stickerID The ID of the sticker
     * @returns {Promise<Object>} A sticker object
     */
    getRESTGuildSticker(guildID, stickerID) {
        if(!this.options.restMode) {
            return Promise.reject(new Error("Dysnomia REST mode is not enabled"));
        }
        return this.requestHandler.request("GET", Endpoints.GUILD_STICKER(guildID, stickerID), true);
    }

    /**
     * Get a guild's stickers via the REST API. REST mode is required to use this endpoint.
     * @param {String} guildID The ID of the guild
     * @returns {Promise<Array<Object>>} An array of guild sticker objects
     */
    getRESTGuildStickers(guildID) {
        if(!this.options.restMode) {
            return Promise.reject(new Error("Dysnomia REST mode is not enabled"));
        }
        return this.requestHandler.request("GET", Endpoints.GUILD_STICKERS(guildID), true);
    }

    /**
     * Gets a user's voice state in a guild via the REST API. REST mode is required to use this endpoint.
     * @param {String} guildID The ID of the guild
     * @param {String} [userID="@me"] The ID of the user
     * @returns {Promise<VoiceState>}
     */
    getRESTGuildVoiceState(guildID, userID = "@me") {
        if(!this.options.restMode) {
            return Promise.reject(new Error("Dysnomia REST mode is not enabled"));
        }
        return this.requestHandler.request("GET", Endpoints.GUILD_VOICE_STATE(guildID, userID), true).then((state) => new VoiceState(state));
    }

    /**
     * Get a sticker via the REST API. REST mode is required to use this endpoint.
     * @param {String} stickerID The ID of the sticker
     * @returns {Promise<Object>} A sticker object
     */
    getRESTSticker(stickerID) {
        if(!this.options.restMode) {
            return Promise.reject(new Error("Dysnomia REST mode is not enabled"));
        }
        return this.requestHandler.request("GET", Endpoints.STICKER(stickerID), true);
    }

    /**
     * Get a user's data via the REST API. REST mode is required to use this endpoint.
     * @param {String} userID The ID of the user
     * @returns {Promise<User>}
     */
    getRESTUser(userID) {
        if(!this.options.restMode) {
            return Promise.reject(new Error("Dysnomia REST mode is not enabled"));
        }
        return this.requestHandler.request("GET", Endpoints.USER(userID), true).then((user) => new User(user, this));
    }

    /**
     * Gets the role connection metadata
     * @returns {Promise<Object[]>}
     */
    getRoleConnectionMetadata() {
        return this.requestHandler.request("GET", Endpoints.ROLE_CONNECTION_METADATA(this.application.id), true).then((metadata) => metadata.map((meta) => ({
            ...meta,
            nameLocalizations: meta.name_localizations,
            descriptionLocalizations: meta.description_localizations
        })));
    }

    /**
     * Get properties of the bot user
     * @returns {Promise<ExtendedUser>}
     */
    getSelf() {
        return this.requestHandler.request("GET", Endpoints.USER("@me"), true).then((data) => new ExtendedUser(data, this));
    }

    /**
     * Gets the list of SKUs associated with the current application
     * @returns {Promise<Array<Object>>} An array of [SKU objects](https://discord.com/developers/docs/monetization/skus#sku-object)
     */
    getSKUs() {
        return this.requestHandler.request("GET", Endpoints.SKUS(this.application.id), true);
    }

    /**
     * Get the stage instance associated with a stage channel
     * @param {String} channelID The stage channel ID
     * @returns {Promise<StageInstance>}
     */
    getStageInstance(channelID) {
        return this.requestHandler.request("GET", Endpoints.STAGE_INSTANCE(channelID), true).then((instance) => new StageInstance(instance, this));
    }

    /**
     * Get a sticker pack
     * @param {String} packID The ID of the sticker pack
     * @returns {Promise<Object>} Sticker pack data
     */
    getStickerPack(packID) {
        return this.requestHandler.request("GET", Endpoints.STICKER_PACK(packID), true);
    }

    /**
     * Get the list of available sticker packs
     * @returns {Promise<Object>} An object which contains a value which contains an array of sticker packs
     */
    getStickerPacks() {
        return this.requestHandler.request("GET", Endpoints.STICKER_PACKS, true);
    }

    /**
     * Gets a thread member object for a specified user
     * @param {String} channelID The ID of the thread channel
     * @param {String} memberID The ID of the member
     * @param {Object} [options] Options for the request
     * @param {Boolean} [options.withMember] Whether to include a Member object for each thread member
     * @returns {Promise<ThreadMember>}
     */
    getThreadMember(channelID, memberID, options = {}) {
        options.with_member = options.withMember;
        return this.requestHandler.request("GET", Endpoints.THREAD_MEMBER(channelID, memberID), true, options).then((m) => new ThreadMember(m, this));
    }

    /**
     * Get a list of members that are part of a thread channel
     * @param {String} channelID The ID of the thread channel
     * @param {Object} [options] Options for the request
     * @param {String} [options.after] Fetch thread members after this user ID
     * @param {Number} [options.limit] The maximum amount of thread members to fetch
     * @param {Boolean} [options.withMember] Whether to include a Member object for each thread member
     * @returns {Promise<Array<ThreadMember>>}
     */
    getThreadMembers(channelID, options = {}) {
        options.with_member = options.withMember;
        return this.requestHandler.request("GET", Endpoints.THREAD_MEMBERS(channelID), true, options).then((members) => members.map((member) => new ThreadMember(member, this)));
    }

    /**
     * Get a list of general/guild-specific voice regions
     * @param {String} [guildID] The ID of the guild
     * @returns {Promise<Array<Object>>} Resolves with an array of voice region objects
     */
    getVoiceRegions(guildID) {
        return guildID ? this.requestHandler.request("GET", Endpoints.GUILD_VOICE_REGIONS(guildID), true) : this.requestHandler.request("GET", Endpoints.VOICE_REGIONS, true);
    }

    /**
     * Get a webhook
     * @param {String} webhookID The ID of the webhook
     * @param {String} [token] The token of the webhook, used instead of the Bot Authorization token
     * @returns {Promise<Object>} Resolves with a webhook object
     */
    getWebhook(webhookID, token) {
        return this.requestHandler.request("GET", token ? Endpoints.WEBHOOK_TOKEN(webhookID, token) : Endpoints.WEBHOOK(webhookID), !token);
    }

    /**
     * Get a webhook message
     * @param {String} webhookID The ID of the webhook
     * @param {String} token The token of the webhook
     * @param {String} messageID The message ID of a message sent by this webhook
     * @returns {Promise<Message>} Resolves with a webhook message
     */
    getWebhookMessage(webhookID, token, messageID) {
        return this.requestHandler.request("GET", Endpoints.WEBHOOK_MESSAGE(webhookID, token, messageID)).then((message) => new Message(message, this));
    }

    /**
     * Join a thread
     * @param {String} channelID The ID of the thread channel
     * @param {String} [userID="@me"] The user ID of the user joining
     * @returns {Promise}
     */
    joinThread(channelID, userID = "@me") {
        return this.requestHandler.request("PUT", Endpoints.THREAD_MEMBER(channelID, userID), true);
    }
}

/** @type {typeof BaseClient} */
module.exports = BaseClient;
