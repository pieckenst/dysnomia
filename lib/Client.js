"use strict";
const BaseClient = require("./BaseClient");
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const ApplicationCommand = require("./structures/ApplicationCommand");
const Base = require("./structures/Base");
const Channel = require("./structures/Channel");

const Constants = require("./Constants");
const Endpoints = require("./rest/Endpoints");
const ExtendedUser = require("./structures/ExtendedUser");
const Guild = require("./structures/Guild");

const GuildTemplate = require("./structures/GuildTemplate");
const GuildScheduledEvent = require("./structures/GuildScheduledEvent");
const Invite = require("./structures/Invite");
const Member = require("./structures/Member");
const Message = require("./structures/Message");
const Permission = require("./structures/Permission");

const Role = require("./structures/Role");

const StageInstance = require("./structures/StageInstance");
const ThreadMember = require("./structures/ThreadMember");
const AutoModerationRule = require("./structures/AutoModerationRule");

const Entitlement = require("./structures/Entitlement");

class Client extends BaseClient {
    /**
     * Create an auto moderation rule
     * @param {String} guildID the ID of the guild to create the rule in
     * @param {Object} options The rule to create
     * @param {Object[]} options.actions The [actions](https://discord.com/developers/docs/resources/auto-moderation#auto-moderation-action-object) done when the rule is violated
     * @param {Boolean} [options.enabled=false] If the rule is enabled, false by default
     * @param {Number} options.eventType The [event type](https://discord.com/developers/docs/resources/auto-moderation#auto-moderation-rule-object-event-types) for the rule
     * @param {String[]} [options.exemptChannels] Any channels where this rule does not apply
     * @param {String[]} [options.exemptRoles] Any roles to which this rule does not apply
     * @param {String} options.name The name of the rule
     * @param {String} [options.reason] The reason to be displayed in audit logs
     * @param {Object} [options.triggerMetadata] The [trigger metadata](https://discord.com/developers/docs/resources/auto-moderation#auto-moderation-rule-object-trigger-metadata) for the rule
     * @param {Number} options.triggerType The [trigger type](https://discord.com/developers/docs/resources/auto-moderation#auto-moderation-rule-object-trigger-types) of the rule
     * @returns {Promise<AutoModerationRule>}
     */
    createAutoModerationRule(guildID, options) {
        return this.requestHandler.request("POST", Endpoints.AUTO_MODERATION_RULES(guildID), true, {
            actions: options.actions,
            enabled: options.enabled,
            event_type: options.eventType,
            exempt_channels: options.exemptChannels,
            exempt_roles: options.exemptRoles,
            name: options.name,
            reason: options.reason,
            trigger_metadata: options.triggerMetadata,
            trigger_type: options.triggerType
        }).then((rule) => new AutoModerationRule(rule, this));
    }

    /**
     * Create a channel in a guild
     * @param {String} guildID The ID of the guild to create the channel in
     * @param {String} name The name of the channel
     * @param {String} [type=0] The type of the channel, either 0 (text), 2 (voice), 4 (category), 5 (news), 13 (stage), or 15 (forum)
     * @param {Object | String} [options] The properties the channel should have.
     * @param {Array<Object>} [options.availableTags] Available tags for a forum channel
     * @param {Number} [options.bitrate] The bitrate of the channel (voice channels only)
     * @param {Number} [options.defaultAutoArchiveDuration] The default duration of newly created threads in minutes to automatically archive the thread after inactivity (60, 1440, 4320, 10080)
     * @param {Number} [options.defaultForumLayout] The default forum layout view used to display forum posts
     * @param {Object} [options.defaultReactionEmoji] The emoji to show as the reaction button (forum channels only)
     * @param {Object} [options.defaultSortOrder] The default thread sorting order
     * @param {Number} [options.defaultThreadRateLimitPerUser] The initial ratelimit of the channel to use on newly created threads, in seconds. 0 means no ratelimit is enabled
     * @param {Boolean} [options.nsfw] The nsfw status of the channel
     * @param {String?} [options.parentID] The ID of the parent category channel for this channel
     * @param {Array<Object>} [options.permissionOverwrites] An array containing permission overwrite objects
     * @param {Number} [options.position] The sorting position of the channel
     * @param {Number} [options.rateLimitPerUser] The time in seconds a user has to wait before sending another message (does not affect bots or users with manageMessages/manageChannel permissions) (text channels only)
     * @param {String} [options.reason] The reason to be displayed in audit logs
     * @param {String} [options.rtcRegion] The RTC region ID of the channel (automatic if `null`) (voice channels only)
     * @param {String} [options.topic] The topic of the channel (text channels only)
     * @param {Number} [options.userLimit] The channel user limit (voice channels only)
     * @param {Number} [options.videoQualityMode] The camera video quality mode of the voice channel (voice channels only). `1` is auto, `2` is 720p
     * @returns {Promise<CategoryChannel | ForumChannel | TextChannel | TextVoiceChannel>}
     */
    createChannel(guildID, name, type, options = {}) {
        return this.requestHandler.request("POST", Endpoints.GUILD_CHANNELS(guildID), true, {
            name: name,
            type: type,
            available_tags: options.availableTags?.map((tag) => ({
                id: tag.id,
                name: tag.name,
                moderated: tag.moderated,
                emoji_id: tag.emojiID,
                emoji_name: tag.emojiName
            })),
            bitrate: options.bitrate,
            default_auto_archive_duration: options.defaultAutoArchiveDuration,
            default_forum_layout: options.defaultForumLayout,
            default_reaction_emoji: options.defaultReactionEmoji && {
                emoji_id: options.defaultReactionEmoji.emojiID,
                emoji_name: options.defaultReactionEmoji.emojiName
            },
            default_sort_order: options.defaultSortOrder,
            default_thread_rate_limit_per_user: options.defaultThreadRateLimitPerUser,
            nsfw: options.nsfw,
            parent_id: options.parentID,
            permission_overwrites: options.permissionOverwrites,
            position: options.position,
            rate_limit_per_user: options.rateLimitPerUser,
            reason: options.reason,
            rtc_region: options.rtcRegion,
            topic: options.topic,
            user_limit: options.userLimit,
            video_quality_mode: options.videoQualityMode
        }).then((channel) => Channel.from(channel, this));
    }

    /**
     * Create an invite for a channel
     * @param {String} channelID The ID of the channel
     * @param {Object} [options] Invite generation options
     * @param {Number} [options.maxAge] How long the invite should last in seconds
     * @param {Number} [options.maxUses] How many uses the invite should last for
     * @param {String} [options.targetApplicationID] The target application id
     * @param {Number} [options.targetType] The type of the target application
     * @param {String} [options.targetUserID] The ID of the user whose stream should be displayed for the invite (`options.targetType` must be `1`)
     * @param {Boolean} [options.temporary] Whether the invite grants temporary membership or not
     * @param {Boolean} [options.unique] Whether the invite is unique or not
     * @param {String} [reason] The reason to be displayed in audit logs
     * @returns {Promise<Invite>}
     */
    createChannelInvite(channelID, options = {}, reason) {
        return this.requestHandler.request("POST", Endpoints.CHANNEL_INVITES(channelID), true, {
            max_age: options.maxAge,
            max_uses: options.maxUses,
            target_application_id: options.targetApplicationID,
            target_type: options.targetType,
            target_user_id: options.targetUserID,
            temporary: options.temporary,
            unique: options.unique,
            reason: reason
        }).then((invite) => new Invite(invite, this));
    }

    /**
     * Create a channel webhook
     * @param {String} channelID The ID of the channel to create the webhook in
     * @param {Object} options Webhook options
     * @param {String} options.name The default name
     * @param {String?} [options.avatar] The default avatar as a base64 data URI. Note: base64 strings alone are not base64 data URI strings
     * @param {String} [reason] The reason to be displayed in audit logs
     * @returns {Promise<Object>} Resolves with a webhook object
     */
    createChannelWebhook(channelID, options, reason) {
        options.reason = reason;
        return this.requestHandler.request("POST", Endpoints.CHANNEL_WEBHOOKS(channelID), true, options);
    }

    /**
     * Create a global application command
     * @param {Object} command A command object
     * @param {String} command.name The command name
     * @param {Number} command.type The [type](https://discord.com/developers/docs/interactions/application-commands#application-command-object-application-command-types) of command
     * @param {Object} [command.nameLocalizations] A map of [locales](https://discord.com/developers/docs/reference#locales) to names for that locale
     * @param {String} [command.description] The command description (chat input commands only)
     * @param {Object} [command.descriptionLocalizations] A map of [locales](https://discord.com/developers/docs/reference#locales) to descriptions for that locale
     * @param {Boolean} [command.nsfw] Whether this command is age-restricted or not
     * @param {Array<Object>} [command.options] An array of [command options](https://discord.com/developers/docs/interactions/application-commands#application-command-object-application-command-option-structure)
     * @param {BigInt | Number | String | Permission} [command.defaultMemberPermissions] The default member [permissions](https://discord.com/developers/docs/topics/permissions) represented as a bit set
     * @param {Boolean} [command.dmPermission=true] If this command can be used in direct messages
     * @returns {Promise<ApplicationCommand>}
     */
    createCommand(command) {
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
        return this.requestHandler.request("POST", Endpoints.COMMANDS(this.application.id), true, command).then((applicationCommand) => new ApplicationCommand(applicationCommand, this));
    }

    /**
     * Create a guild
     * @param {String} name The name of the guild
     * @param {Object} options The properties of the guild
     * @param {String} [options.afkChannelID] The ID of the AFK voice channel
     * @param {Number} [options.afkTimeout] The AFK timeout in seconds
     * @param {Array<Object>} [options.channels] The new channels of the guild. IDs are placeholders which allow use of category channels.
     * @param {Number} [options.defaultNotifications] The default notification settings for the guild. 0 is "All Messages", 1 is "Only @mentions".
     * @param {Number} [options.explicitContentFilter] The level of the explicit content filter for messages/images in the guild. 0 disables message scanning, 1 enables scanning the messages of members without roles, 2 enables scanning for all messages.
     * @param {String} [options.icon] The guild icon as a base64 data URI. Note: base64 strings alone are not base64 data URI strings
     * @param {Array<Object>} [options.roles] The new roles of the guild, the first one is the @everyone role. IDs are placeholders which allow channel overwrites.
     * @param {Number} [options.systemChannelFlags] The system channel flags
     * @param {String} [options.systemChannelID] The ID of the system channel
     * @param {Number} [options.verificationLevel] The guild verification level
     * @returns {Promise<Guild>}
     */
    createGuild(name, options) {
        if(this.guilds.size > 9) {
            throw new Error("This method can't be used when in 10 or more guilds.");
        }

        return this.requestHandler.request("POST", Endpoints.GUILDS, true, {
            name: name,
            icon: options.icon,
            verification_level: options.verificationLevel,
            default_message_notifications: options.defaultNotifications,
            explicit_content_filter: options.explicitContentFilter,
            system_channel_id: options.systemChannelID,
            afk_channel_id: options.afkChannelID,
            afk_timeout: options.afkTimeout,
            roles: options.roles,
            channels: options.channels,
            system_channel_flags: options.systemChannelFlags
        }).then((guild) => new Guild(guild, this));
    }

    /**
     * Create a guild application command
     * @param {String} guildID The ID of the guild to create the command in
     * @param {Object} command A command object
     * @param {String} command.name The command name
     * @param {Number} command.type The [type](https://discord.com/developers/docs/interactions/application-commands#application-command-object-application-command-types) of command
     * @param {Object} [command.nameLocalizations] A map of [locales](https://discord.com/developers/docs/reference#locales) to names for that locale
     * @param {String} [command.description] The command description (chat input commands only)
     * @param {Object} [command.descriptionLocalizations] A map of [locales](https://discord.com/developers/docs/reference#locales) to descriptions for that locale
     * @param {Boolean} [command.nsfw] Whether this command is age-restricted or not
     * @param {Array<Object>} [command.options] An array of [command options](https://discord.com/developers/docs/interactions/application-commands#application-command-object-application-command-option-structure)
     * @param {BigInt | Number | String | Permission} [command.defaultMemberPermissions] The default member [permissions](https://discord.com/developers/docs/topics/permissions) represented as a bit set
     * @returns {Promise<ApplicationCommand>}
     */
    createGuildCommand(guildID, command) {
        if(command.name !== undefined && command.type === 1) {
            command.name = command.name.toLowerCase();
        }
        if(command.defaultMemberPermissions !== undefined) {
            command.defaultMemberPermissions = command.defaultMemberPermissions instanceof Permission ? String(command.defaultMemberPermissions.allow) : String(command.defaultMemberPermissions);
        }
        command.default_member_permissions = command.defaultMemberPermissions;
        command.description_localizations = command.descriptionLocalizations;
        command.name_localizations = command.nameLocalizations;
        return this.requestHandler.request("POST", Endpoints.GUILD_COMMANDS(this.application.id, guildID), true, command).then((applicationCommand) => new ApplicationCommand(applicationCommand, this));
    }

    /**
     * Create a guild emoji object
     * @param {String} guildID The ID of the guild to create the emoji in
     * @param {Object} options Emoji options
     * @param {String} options.image The base 64 encoded string
     * @param {String} options.name The name of emoji
     * @param {Array} [options.roles] An array containing authorized role IDs
     * @param {String} [reason] The reason to be displayed in audit logs
     * @returns {Promise<Object>} A guild emoji object
     */
    createGuildEmoji(guildID, options, reason) {
        options.reason = reason;
        return this.requestHandler.request("POST", Endpoints.GUILD_EMOJIS(guildID), true, options);
    }

    /**
     * Create a guild based on a template. This can only be used with bots in less than 10 guilds
     * @param {String} code The template code
     * @param {String} name The name of the guild
     * @param {String} [icon] The 128x128 icon as a base64 data URI
     * @returns {Promise<Guild>}
     */
    createGuildFromTemplate(code, name, icon) {
        return this.requestHandler.request("POST", Endpoints.GUILD_TEMPLATE(code), true, {
            name,
            icon
        }).then((guild) => new Guild(guild, this));
    }

    /**
     * Create a guild scheduled event
     * @param {String} guildID The guild ID where the event will be created
     * @param {Object} event The event to be created
     * @param {String} [event.channelID] The channel ID of the event. This is optional if `entityType` is `3` (external)
     * @param {String} [event.description] The description of the event
     * @param {Object} [event.entityMetadata] The entity metadata for the scheduled event. This is required if `entityType` is `3` (external)
     * @param {String} [event.entityMetadata.location] Location of the event
     * @param {Number} event.entityType The [entity type](https://discord.com/developers/docs/resources/guild-scheduled-event#guild-scheduled-event-object-guild-scheduled-event-entity-types) of the scheduled event
     * @param {String} [event.image] Base 64 encoded image for the scheduled event
     * @param {String} event.name The name of the event
     * @param {String} event.privacyLevel The privacy level of the event
     * @param {Date} [event.scheduledEndTime] The time when the event is scheduled to end. This is required if `entityType` is `3` (external)
     * @param {Date} event.scheduledStartTime The time the event will start
     * @param {String} [reason] The reason to be displayed in audit logs
     * @returns {Promise<GuildScheduledEvent>}
     */
    createGuildScheduledEvent(guildID, event, reason) {
        return this.requestHandler.request("POST", Endpoints.GUILD_SCHEDULED_EVENTS(guildID), true, {
            channel_id: event.channelID,
            description: event.description,
            entity_metadata: event.entityMetadata,
            entity_type: event.entityType,
            image: event.image,
            name: event.name,
            privacy_level: event.privacyLevel,
            scheduled_end_time: event.scheduledEndTime,
            scheduled_start_time: event.scheduledStartTime,
            reason: reason
        }).then((data) => new GuildScheduledEvent(data, this));
    }

    /**
     * Create a guild sticker
     * @param {String} guildID The guild to create a sticker in
     * @param {Object} options Sticker options
     * @param {String} options.description The description of the sticker
     * @param {Object} options.file A file object
     * @param {Buffer} options.file.file A buffer containing file data
     * @param {String} options.file.name What to name the file
     * @param {String} options.name The name of the sticker
     * @param {String} options.tags The Discord name of a unicode emoji representing the sticker's expression
     * @param {String} [reason] The reason to be displayed in audit logs
     * @returns {Promise<Object>} A sticker object
     */
    createGuildSticker(guildID, options, reason) {
        return this.requestHandler.request("POST", Endpoints.GUILD_STICKERS(guildID), true, {
            description: options.description,
            name: options.name,
            tags: options.tags,
            reason: reason
        }, [{
            ...options.file,
            fieldName: "file"
        }]);
    }

    /**
     * Create a template for a guild
     * @param {String} guildID The ID of the guild
     * @param {String} name The name of the template
     * @param {String} [description] The description for the template
     * @returns {Promise<GuildTemplate>}
     */
    createGuildTemplate(guildID, name, description) {
        return this.requestHandler.request("POST", Endpoints.GUILD_TEMPLATES(guildID), true, {
            name,
            description
        }).then((template) => new GuildTemplate(template, this));
    }

    /**
     * Respond to the interaction with a message
     * Note: Use webhooks if you have already responded with an interaction response.
     * @param {String} interactionID The interaction ID.
     * @param {String} interactionToken The interaction Token.
     * @param {Object} options The options object.
     * @param {Object} [options.data] The data to send with the response. **WARNING: This call expects raw API data and does not transform it in any way.**
     * @param {Number} options.type The response type to send. See [the official Discord API documentation entry](https://discord.com/developers/docs/interactions/receiving-and-responding#interaction-response-object-interaction-callback-type) for valid types
     * @param {Object | Array<Object>} [file] A file object (or an Array of them)
     * @param {String} [file.fieldName] The multipart field name
     * @param {Buffer} file.file A buffer containing file data
     * @param {String} file.name What to name the file
     * @returns {Promise}
     */
    createInteractionResponse(interactionID, interactionToken, options, file) {
        return this.requestHandler.request("POST", Endpoints.INTERACTION_RESPOND(interactionID, interactionToken), true, options, file, "/interactions/:id/:token/callback");
    }

    /**
     * Create a message in a channel
     * Note: If you want to DM someone, the user ID is **not** the DM channel ID. use Client.getDMChannel() to get the DM channel for a user
     * @param {String} channelID The ID of the channel
     * @param {String | Object} content A string or object. If an object is passed:
     * @param {Object} [content.allowedMentions] A list of mentions to allow (overrides default)
     * @param {Boolean} [content.allowedMentions.everyone] Whether or not to allow @everyone/@here.
     * @param {Boolean | Array<String>} [content.allowedMentions.roles] Whether or not to allow all role mentions, or an array of specific role mentions to allow.
     * @param {Boolean | Array<String>} [content.allowedMentions.users] Whether or not to allow all user mentions, or an array of specific user mentions to allow.
     * @param {Boolean} [content.allowedMentions.repliedUser] Whether or not to mention the author of the message being replied to.
     * @param {Array<Object>} [content.attachments] The files to attach to the message
     * @param {Buffer} content.attachments[].file A buffer containing file data
     * @param {String} content.attachments[].filename What to name the file
     * @param {String} [content.attachments[].description] A description for the attachment
     * @param {Array<Object>} [content.components] An array of components. See [Discord's Documentation](https://discord.com/developers/docs/interactions/message-components#what-is-a-component) for object structure
     * @param {String} [content.content] A content string
     * @param {Boolean} [content.enforceNonce] If set and nonce is present, check the message for uniqueness in the past few minutes
     * @param {Array<Object>} [content.embeds] An array of embed objects. See [Discord's Documentation](https://discord.com/developers/docs/resources/channel#embed-object) for object structure
     * @param {Number} [content.flags] Message flags. See [Discord's Documentation](https://discord.com/developers/docs/resources/channel#message-object-message-flags) for a list
     * @param {Object} [content.messageReference] The message reference, used when replying to messages
     * @param {String} [content.messageReference.channelID] The channel ID of the referenced message. Required if forwarding a message
     * @param {Boolean} [content.messageReference.failIfNotExists=true] Whether to throw an error if the message reference doesn't exist. If false, and the referenced message doesn't exist, the message is created without a referenced message
     * @param {String} [content.messageReference.guildID] The guild ID of the referenced message
     * @param {String} content.messageReference.messageID The message ID of the referenced message. This cannot reference a system message
     * @param {Number} [content.messageReference.type=0] The type of message reference (0 is reply, 1 is forward). Note that this may become required in the future
     * @param {String | Number} [content.nonce] A value that can be used to check if the message was sent
     * @param {Object} [content.poll] A poll object. See [Discord's Documentation](https://discord.com/developers/docs/resources/poll#poll-create-request-object-poll-create-request-object-structure) for object structure
     * @param {Array<String>} [content.stickerIDs] An array of IDs corresponding to stickers to send
     * @param {Boolean} [content.tts] Set the message TTS flag
     * @returns {Promise<Message>}
     */
    createMessage(channelID, content) {
        if(content !== undefined) {
            if(typeof content !== "object" || content === null) {
                content = {
                    content: "" + content
                };
            } else if(content.content !== undefined && typeof content.content !== "string") {
                content.content = "" + content.content;
            }
            content.allowed_mentions = this._formatAllowedMentions(content.allowedMentions);
            content.sticker_ids = content.stickerIDs;
            if(content.messageReference) {
                content.message_reference = content.messageReference;
                if(content.messageReference.messageID !== undefined) {
                    content.message_reference.message_id = content.messageReference.messageID;
                    content.messageReference.messageID = undefined;
                }
                if(content.messageReference.channelID !== undefined) {
                    content.message_reference.channel_id = content.messageReference.channelID;
                    content.messageReference.channelID = undefined;
                }
                if(content.messageReference.guildID !== undefined) {
                    content.message_reference.guild_id = content.messageReference.guildID;
                    content.messageReference.guildID = undefined;
                }
                if(content.messageReference.failIfNotExists !== undefined) {
                    content.message_reference.fail_if_not_exists = content.messageReference.failIfNotExists;
                    content.messageReference.failIfNotExists = undefined;
                }
            }
            content.enforce_nonce = content.enforceNonce;
        }

        const {files, attachments} = this._processAttachments(content.attachments);
        content.attachments = attachments;

        return this.requestHandler.request("POST", Endpoints.CHANNEL_MESSAGES(channelID), true, content, files).then((message) => new Message(message, this));
    }

    /**
     * Create a guild role
     * @param {String} guildID The ID of the guild to create the role in
     * @param {Object | Role} [options] An object or Role containing the properties to set
     * @param {Number} [options.color] The hex color of the role, in number form (ex: 0x3d15b3 or 4040115)
     * @param {Boolean} [options.hoist] Whether to hoist the role in the user list or not
     * @param {String} [options.icon] The role icon as a base64 data URI
     * @param {Boolean} [options.mentionable] Whether the role is mentionable or not
     * @param {String} [options.name] The name of the role
     * @param {BigInt | Number | String | Permission} [options.permissions] The role permissions
     * @param {String} [options.unicodeEmoji] The role's unicode emoji
     * @param {String} [reason] The reason to be displayed in audit logs
     * @returns {Promise<Role>}
     */
    createRole(guildID, options, reason) {
        if(options.permissions !== undefined) {
            options.permissions = options.permissions instanceof Permission ? String(options.permissions.allow) : String(options.permissions);
        }
        return this.requestHandler.request("POST", Endpoints.GUILD_ROLES(guildID), true, {
            name: options.name,
            permissions: options.permissions,
            color: options.color,
            hoist: options.hoist,
            icon: options.icon,
            mentionable: options.mentionable,
            unicode_emoji: options.unicodeEmoji,
            reason: reason
        }).then((role) => {
            const guild = this.guilds.get(guildID);
            if(guild) {
                return guild.roles.add(role, guild);
            } else {
                return new Role(role);
            }
        });
    }

    /**
     * Create a stage instance
     * @param {String} channelID The ID of the stage channel to create the instance in
     * @param {Object} options The stage instance options
     * @param {String} [options.guildScheduledEventID] The ID of the guild scheduled event associated with the stage instance
     * @param {Number} [options.privacyLevel] The privacy level of the stage instance. 1 is public (deprecated), 2 is guild only
     * @param {Boolean} [options.sendStartNotification] Whether to notify @everyone that a stage instance has started or not
     * @param {String} options.topic The stage instance topic
     * @returns {Promise<StageInstance>}
     */
    createStageInstance(channelID, options) {
        return this.requestHandler.request("POST", Endpoints.STAGE_INSTANCES, true, {
            channel_id: channelID,
            guild_scheduled_event_id: options.guildScheduledEventID,
            privacy_level: options.privacyLevel,
            send_start_notification: options.sendStartNotification,
            topic: options.topic
        }).then((instance) => new StageInstance(instance, this));
    }

    /**
     * Creates a testing entitlement for a user/guild
     * @param {Object} options The options for this request
     * @param {String} options.skuID The ID of the SKU to grant the entitlement to
     * @param {String} options.ownerID The ID of the guild or user to grant the entitlement to
     * @param {Number} options.ownerType The type of the subscription to grant. `1` for a guild subscription, `2` for a user subscription.
     * @returns {Promise<Entitlement>}
     */
    createTestEntitlement(options) {
        return this.requestHandler.request("POST", Endpoints.ENTITLEMENTS(this.application.id), true, options).then((entitlement) => new Entitlement(entitlement, this));
    }

    /**
     * Create a thread in a channel
     * @param {String} channelID The ID of the channel
     * @param {Object} options The thread options
     * @param {Number} [options.autoArchiveDuration] Duration in minutes to automatically archive the thread after recent activity, either 60, 1440, 4320 or 10080
     * @param {Array<String>} [options.appliedTags] The tags to apply to the thread (available only in threads in thread-only channels)
     * @param {Boolean} [options.invitable] Whether non-moderators can add other non-moderators to the thread (private threads only)
     * @param {Object} [options.message] The message to attach to the thread (set only if creating a thread in a thread-only channel)
     * @param {Object} [options.message.allowedMentions] A list of mentions to allow (overrides default)
     * @param {Boolean} [options.message.allowedMentions.everyone] Whether or not to allow @everyone/@here.
     * @param {Boolean | Array<String>} [options.message.allowedMentions.roles] Whether or not to allow all role mentions, or an array of specific role mentions to allow.
     * @param {Boolean | Array<String>} [options.message.allowedMentions.users] Whether or not to allow all user mentions, or an array of specific user mentions to allow.
     * @param {Array<Object>} [options.message.attachments] The files to attach to the message
     * @param {Buffer} options.message.attachments[].file A buffer containing file data
     * @param {String} options.message.attachments[].filename What to name the file
     * @param {String} [options.message.attachments[].description] A description for the attachment
     * @param {Array<Object>} [options.message.components] An array of components. See [Discord's Documentation](https://discord.com/developers/docs/interactions/message-components#what-is-a-component) for object structure
     * @param {String} [options.message.content] A content string
     * @param {Array<Object>} [options.message.embeds] An array of embed objects. See [Discord's Documentation](https://discord.com/developers/docs/resources/channel#embed-object) for object structure
     * @param {Array<String>} [options.message.stickerIDs] An array of IDs corresponding to stickers to send
     * @param {String} options.name The thread channel name
     * @param {Number} [options.type] The channel type of the thread to create. It is recommended to explicitly set this property as this will be a required property in API v10
     * @param {Number} [options.rateLimitPerUser] The ratelimit of the channel, in seconds. 0 means no ratelimit is enabled
     * @returns {Promise<ThreadChannel>}
     */
    createThread(channelID, options) {
        if(options.message) {
            if(options.message.content !== undefined && typeof options.message.content !== "string") {
                options.message.content = "" + options.message.content;
            }
            options.message.allowed_mentions = this._formatAllowedMentions(options.message.allowedMentions);
            options.message.sticker_ids = options.message.stickerIDs;
        }

        const {files, attachments} = options.message ? this._processAttachments(options.message.attachments) : {};
        if(options.message) {
            options.message.attachments = attachments;
        }

        return this.requestHandler.request("POST", Endpoints.THREAD_WITHOUT_MESSAGE(channelID), true, {
            auto_archive_duration: options.autoArchiveDuration,
            applied_tags: options.appliedTags,
            invitable: options.invitable,
            message: options.message,
            name: options.name,
            type: options.type,
            rate_limit_per_user: options.rateLimitPerUser
        }, files).then((channel) => Channel.from(channel, this));
    }

    /**
     * Create a thread with an existing message
     * @param {String} channelID The ID of the channel
     * @param {String} messageID The ID of the message to create the thread from
     * @param {Object} options The thread options
     * @param {Number} [options.autoArchiveDuration] Duration in minutes to automatically archive the thread after recent activity, either 60, 1440, 4320 or 10080
     * @param {String} options.name The thread channel name
     * @param {Number} [options.rateLimitPerUser] The ratelimit of the channel, in seconds. 0 means no ratelimit is enabled
     * @returns {Promise<NewsThreadChannel | PublicThreadChannel>}
     */
    createThreadWithMessage(channelID, messageID, options) {
        return this.requestHandler.request("POST", Endpoints.THREAD_WITH_MESSAGE(channelID, messageID), true, {
            name: options.name,
            auto_archive_duration: options.autoArchiveDuration,
            rate_limit_per_user: options.rateLimitPerUser
        }).then((channel) => Channel.from(channel, this));
    }

    /**
     * Crosspost (publish) a message to subscribed channels
     * @param {String} channelID The ID of the NewsChannel
     * @param {String} messageID The ID of the message
     * @returns {Promise<Message>}
     */
    crosspostMessage(channelID, messageID) {
        return this.requestHandler.request("POST", Endpoints.CHANNEL_CROSSPOST(channelID, messageID), true).then((message) => new Message(message, this));
    }

    /**
     * Edit an existing auto moderation rule
     * @param {String} guildID the ID of the guild to edit the rule in
     * @param {String} ruleID The ID of the rule to edit
     * @param {Object} options The new rule options
     * @param {Object[]} [options.actions] The [actions](https://discord.com/developers/docs/resources/auto-moderation#auto-moderation-action-object) done when the rule is violated
     * @param {Boolean} [options.enabled=false] If the rule is enabled, false by default
     * @param {Number} [options.eventType] The [event type](https://discord.com/developers/docs/resources/auto-moderation#auto-moderation-rule-object-event-types) for the rule
     * @param {String[]} [options.exemptChannels] Any channels where this rule does not apply
     * @param {String[]} [options.exemptRoles] Any roles to which this rule does not apply
     * @param {String} [options.name] The name of the rule
     * @param {String} [options.reason] The reason to be displayed in audit logs
     * @param {Object} [options.triggerMetadata] The [trigger metadata](https://discord.com/developers/docs/resources/auto-moderation#auto-moderation-rule-object-trigger-metadata) for the rule
     * @returns {Promise<AutoModerationRule>}
     */
    editAutoModerationRule(guildID, ruleID, options) {
        return this.requestHandler.request("PATCH", Endpoints.AUTO_MODERATION_RULE(guildID, ruleID), true, {
            actions: options.actions,
            enabled: options.enabled,
            event_type: options.eventType,
            exempt_channels: options.exemptChannels,
            exempt_roles: options.exemptRoles,
            name: options.name,
            reason: options.reason,
            trigger_metadata: options.triggerMetadata
        }).then((rule) => new AutoModerationRule(rule, this));
    }

    /**
     * Edit a channel's properties
     * @param {String} channelID The ID of the channel
     * @param {Object} options The properties to edit
     * @param {Boolean} [options.archived] The archive status of the channel (thread channels only)
     * @param {Array<String>} [options.appliedTags] An array of applied tag IDs for the thread (available only in threads in thread-only channels)
     * @param {Number} [options.autoArchiveDuration] The duration in minutes to automatically archive the thread after recent activity, either 60, 1440, 4320 or 10080 (thread channels only)
     * @param {Array<Object>} [options.availableTags] Available tags for a forum channel
     * @param {Number} [options.bitrate] The bitrate of the channel (guild voice channels only)
     * @param {Number?} [options.defaultAutoArchiveDuration] The default duration of newly created threads in minutes to automatically archive the thread after inactivity (60, 1440, 4320, 10080) (guild text/news channels only)
     * @param {Number} [options.defaultForumLayout] The default forum layout view used to display forum posts
     * @param {Object} [options.defaultReactionEmoji] The emoji to show as the reaction button (forum channels only)
     * @param {Number} [options.defaultSortOrder] The default thread sorting order
     * @param {Number} [options.defaultThreadRateLimitPerUser] The initial ratelimit of the channel to use on newly created threads, in seconds. 0 means no ratelimit is enabled
     * @param {Number} [options.flags] The channel flags
     * @param {Boolean} [options.invitable] Whether non-moderators can add other non-moderators to the channel (private thread channels only)
     * @param {Boolean} [options.locked] The lock status of the channel (thread channels only)
     * @param {String} [options.name] The name of the channel
     * @param {Boolean} [options.nsfw] The nsfw status of the channel (guild channels only)
     * @param {String?} [options.parentID] The ID of the parent channel category for this channel (guild text/voice channels only)
     * @param {Array<Object>} [options.permissionOverwrites] An array containing permission overwrite objects
     * @param {Number} [options.position] The sorting position of the channel (guild channels only)
     * @param {Number} [options.rateLimitPerUser] The time in seconds a user has to wait before sending another message (does not affect bots or users with manageMessages/manageChannel permissions) (guild text and thread channels only)
     * @param {String?} [options.rtcRegion] The RTC region ID of the channel (automatic if `null`) (guild voice channels only)
     * @param {String} [options.topic] The topic of the channel (guild text channels only)
     * @param {Number} [options.userLimit] The channel user limit (guild voice channels only)
     * @param {Number} [options.videoQualityMode] The camera video quality mode of the channel (guild voice channels only). `1` is auto, `2` is 720p
     * @param {String} [reason] The reason to be displayed in audit logs
     * @returns {Promise<CategoryChannel | ForumChannel | TextChannel | TextVoiceChannel | NewsChannel | NewsThreadChannel | PrivateThreadChannel | PublicThreadChannel>}
     */
    editChannel(channelID, options, reason) {
        return this.requestHandler.request("PATCH", Endpoints.CHANNEL(channelID), true, {
            archived: options.archived,
            auto_archive_duration: options.autoArchiveDuration,
            available_tags: options.availableTags?.map((tag) => ({
                id: tag.id,
                name: tag.name,
                moderated: tag.moderated,
                emoji_id: tag.emojiID,
                emoji_name: tag.emojiName
            })),
            applied_tags: options.appliedTags,
            bitrate: options.bitrate,
            default_auto_archive_duration: options.defaultAutoArchiveDuration,
            default_forum_layout: options.defaultForumLayout,
            default_reaction_emoji: options.defaultReactionEmoji && {
                emoji_id: options.defaultReactionEmoji.emojiID,
                emoji_name: options.defaultReactionEmoji.emojiName
            },
            default_sort_order: options.defaultSortOrder,
            default_thread_rate_limit_per_user: options.defaultThreadRateLimitPerUser,
            flags: options.flags,
            icon: options.icon,
            invitable: options.invitable,
            locked: options.locked,
            name: options.name,
            nsfw: options.nsfw,
            owner_id: options.ownerID,
            parent_id: options.parentID,
            position: options.position,
            rate_limit_per_user: options.rateLimitPerUser,
            rtc_region: options.rtcRegion,
            topic: options.topic,
            user_limit: options.userLimit,
            video_quality_mode: options.videoQualityMode,
            permission_overwrites: options.permissionOverwrites,
            reason: reason
        }).then((channel) => Channel.from(channel, this));
    }

    /**
     * Create a channel permission overwrite
     * @param {String} channelID The ID of channel
     * @param {String} overwriteID The ID of the overwritten user or role (everyone role ID = guild ID)
     * @param {BigInt} allow The permissions number for allowed permissions
     * @param {BigInt} deny The permissions number for denied permissions
     * @param {Number} type The object type of the overwrite, either 1 for "member" or 0 for "role"
     * @param {String} [reason] The reason to be displayed in audit logs
     * @returns {Promise}
     */
    editChannelPermission(channelID, overwriteID, allow, deny, type, reason) {
        if(typeof type === "string") { // backward compatibility
            type = type === "member" ? 1 : 0;
        }
        return this.requestHandler.request("PUT", Endpoints.CHANNEL_PERMISSION(channelID, overwriteID), true, {
            allow,
            deny,
            type,
            reason
        });
    }

    /**
     * Edit a guild channel's position. Note that channel position numbers are grouped by type (category, text, voice), then sorted in ascending order (lowest number is on top).
     * @param {String} channelID The ID of the channel
     * @param {Number} position The new position of the channel
     * @param {Object} [options] Additional options when editing position
     * @param {Boolean} [options.lockPermissions] Whether to sync the channel's permissions with the new parent, if changing parents
     * @param {String} [options.parentID] The new parent ID (category channel) for the channel that is moved
     * @returns {Promise}
     */
    editChannelPosition(channelID, position, options = {}) {
        let channels = this.guilds.get(this.channelGuildMap[channelID]).channels;
        const channel = channels.get(channelID);
        if(!channel) {
            return Promise.reject(new Error(`Channel ${channelID} not found`));
        }
        if(channel.position === position) {
            return Promise.resolve();
        }
        const min = Math.min(position, channel.position);
        const max = Math.max(position, channel.position);
        channels = channels.filter((chan) => {
            return chan.type === channel.type
                && min <= chan.position
                && chan.position <= max
                && chan.id !== channelID;
        }).sort((a, b) => a.position - b.position);
        if(position > channel.position) {
            channels.push(channel);
        } else {
            channels.unshift(channel);
        }
        return this.requestHandler.request("PATCH", Endpoints.GUILD_CHANNELS(this.channelGuildMap[channelID]), true, channels.map((channel, index) => ({
            id: channel.id,
            position: index + min,
            lock_permissions: options.lockPermissions,
            parent_id: options.parentID
        })));
    }

    /**
     * Edit multiple guild channels' positions. Note that channel position numbers are grouped by type (category, text, voice), then sorted in ascending order (lowest number is on top).
     * @param {String} guildID The ID of the guild
     * @param {Array<Object>} channelPositions An array of [ChannelPosition](https://discord.com/developers/docs/resources/guild#modify-guild-channel-positions)
     * @param {String} channelPositions[].id The ID of the channel
     * @param {Number} [channelPositions[].position] The new position of the channel
     * @param {Boolean} [channelPositions[].lockPermissions] Whether to sync the channel's permissions with the new parent, if changing parents
     * @param {String} [channelPositions[].parentID] The new parent ID (category channel) for the channel that is moved. For each request, only one channel can change parents
     * @returns {Promise}
     */
    editChannelPositions(guildID, channelPositions) {
        return this.requestHandler.request("PATCH", Endpoints.GUILD_CHANNELS(guildID), true, channelPositions.map((channelPosition) => {
            return {
                id: channelPosition.id,
                position: channelPosition.position,
                lock_permissions: channelPosition.lockPermissions,
                parent_id: channelPosition.parentID
            };
        }));
    }

    /**
     * Edit a global application command
     * @param {String} commandID The command id
     * @param {Object} command A command object
     * @param {String} [command.name] The command name
     * @param {Object} [command.nameLocalizations] A map of [locales](https://discord.com/developers/docs/reference#locales) to names for that locale
     * @param {String} [command.description] The command description (chat input commands only)
     * @param {Object} [command.descriptionLocalizations] A map of [locales](https://discord.com/developers/docs/reference#locales) to descriptions for that locale
     * @param {Array<Object>} [command.options] An array of [command options](https://discord.com/developers/docs/interactions/application-commands#application-command-object-application-command-option-structure)
     * @param {bigint | number | string | Permission} [command.defaultMemberPermissions] The default member [permissions](https://discord.com/developers/docs/topics/permissions) represented as a bit set
     * @param {String} [command.defaultMemberPermissions] The [permissions](https://discord.com/developers/docs/topics/permissions) required by default for this command to be usable
     * @param {Boolean} [command.dmPermission] If this command can be used in direct messages
     * @returns {Promise<ApplicationCommand>}
     */
    editCommand(commandID, command) {
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
        return this.requestHandler.request("PATCH", Endpoints.COMMAND(this.application.id, commandID), true, command).then((applicationCommand) => new ApplicationCommand(applicationCommand, this));
    }

    /**
     * Edits command permissions for a specific command in a guild.
     * Note: You can only add up to 10 permission overwrites for a command.
     * @param {String} guildID The guild ID
     * @param {String} commandID The command id
     * @param {Array<Object>} permissions An array of [permissions objects](https://discord.com/developers/docs/interactions/application-commands#application-command-permissions-object-application-command-permissions-structure)
     * @returns {Promise<Object>} Resolves with a [GuildApplicationCommandPermissions](https://discord.com/developers/docs/interactions/application-commands#application-command-permissions-object-guild-application-command-permissions-structure) object.
     */
    editCommandPermissions(guildID, commandID, permissions) {
        return this.requestHandler.request("PUT", Endpoints.COMMAND_PERMISSIONS(this.application.id, guildID, commandID), true, {permissions});
    }

    /**
     * Edit a guild
     * @param {String} guildID The ID of the guild
     * @param {Object} options The properties to edit
     * @param {String} [options.afkChannelID] The ID of the AFK voice channel
     * @param {Number} [options.afkTimeout] The AFK timeout in seconds
     * @param {String} [options.banner] The guild banner image as a base64 data URI (VIP only). Note: base64 strings alone are not base64 data URI strings
     * @param {Number} [options.defaultNotifications] The default notification settings for the guild. 0 is "All Messages", 1 is "Only @mentions".
     * @param {String} [options.description] The description for the guild (VIP only)
     * @param {String} [options.discoverySplash] The guild discovery splash image as a base64 data URI (VIP only). Note: base64 strings alone are not base64 data URI strings
     * @param {Number} [options.explicitContentFilter] The level of the explicit content filter for messages/images in the guild. 0 disables message scanning, 1 enables scanning the messages of members without roles, 2 enables scanning for all messages.
     * @param {Array<String>} [options.features] The enabled features for the guild. Note that only certain features can be toggled with the API
     * @param {String} [options.icon] The guild icon as a base64 data URI. Note: base64 strings alone are not base64 data URI strings
     * @param {String} [options.name] The name of the guild
     * @param {String} [options.ownerID] The ID of the user to transfer server ownership to (bot user must be owner)
     * @param {String} [options.preferredLocale] Preferred "COMMUNITY" guild language used in server discovery and notices from Discord, and sent in interactions
     * @param {Boolean} [options.premiumProgressBarEnabled] If the boost progress bar is enabled
     * @param {String} [options.publicUpdatesChannelID] The id of the channel where admins and moderators of "COMMUNITY" guilds receive notices from Discord
     * @param {String} [options.rulesChannelID] The id of the channel where "COMMUNITY" guilds display rules and/or guidelines
     * @param {String} [options.safetyAlertsChannelID] The ID of the channel where safety alerts from Discord are received
     * @param {String} [options.splash] The guild splash image as a base64 data URI (VIP only). Note: base64 strings alone are not base64 data URI strings
     * @param {Number} [options.systemChannelFlags] The flags for the system channel
     * @param {String} [options.systemChannelID] The ID of the system channel
     * @param {Number} [options.verificationLevel] The guild verification level
     * @param {String} [reason] The reason to be displayed in audit logs
     * @returns {Promise<Guild>}
     */
    editGuild(guildID, options, reason) {
        return this.requestHandler.request("PATCH", Endpoints.GUILD(guildID), true, {
            name: options.name,
            icon: options.icon,
            verification_level: options.verificationLevel,
            default_message_notifications: options.defaultNotifications,
            explicit_content_filter: options.explicitContentFilter,
            system_channel_id: options.systemChannelID,
            system_channel_flags: options.systemChannelFlags,
            rules_channel_id: options.rulesChannelID,
            public_updates_channel_id: options.publicUpdatesChannelID,
            preferred_locale: options.preferredLocale,
            afk_channel_id: options.afkChannelID,
            afk_timeout: options.afkTimeout,
            owner_id: options.ownerID,
            splash: options.splash,
            banner: options.banner,
            description: options.description,
            discovery_splash: options.discoverySplash,
            features: options.features,
            premium_progress_bar_enabled: options.premiumProgressBarEnabled,
            safety_alerts_channel_id: options.safetyAlertsChannelID,
            reason: reason
        }).then((guild) => new Guild(guild, this));
    }

    /**
     * Edit a guild application command
     * @param {String} guildID The guild ID
     * @param {Object} command A command object
     * @param {String} [command.name] The command name
     * @param {Object} [command.nameLocalizations] A map of [locales](https://discord.com/developers/docs/reference#locales) to names for that locale
     * @param {String} [command.description] The command description (chat input commands only)
     * @param {Object} [command.descriptionLocalizations] A map of [locales](https://discord.com/developers/docs/reference#locales) to descriptions for that locale
     * @param {Array<Object>} [command.options] An array of [command options](https://discord.com/developers/docs/interactions/application-commands#application-command-object-application-command-option-structure)
     * @param {bigint | number | string | Permission} [command.defaultMemberPermissions] The default member [permissions](https://discord.com/developers/docs/topics/permissions) represented as a bit set
     * @returns {Promise<ApplicationCommand>}
     */
    editGuildCommand(guildID, commandID, command) {
        if(command.name !== undefined && command.type === 1) {
            command.name = command.name.toLowerCase();
        }
        if(command.defaultMemberPermissions !== undefined) {
            command.defaultMemberPermissions = command.defaultMemberPermissions instanceof Permission ? String(command.defaultMemberPermissions.allow) : String(command.defaultMemberPermissions);
        }
        command.default_member_permissions = command.defaultMemberPermissions;
        command.description_localizations = command.descriptionLocalizations;
        command.name_localizations = command.nameLocalizations;
        return this.requestHandler.request("PATCH", Endpoints.GUILD_COMMAND(this.application.id, guildID, commandID), true, command).then((applicationCommand) => new ApplicationCommand(applicationCommand, this));
    }

    /**
     * Edit a guild emoji object
     * @param {String} guildID The ID of the guild to edit the emoji in
     * @param {String} emojiID The ID of the emoji you want to modify
     * @param {Object} options Emoji options
     * @param {String} [options.name] The name of emoji
     * @param {Array} [options.roles] An array containing authorized role IDs
     * @param {String} [reason] The reason to be displayed in audit logs
     * @returns {Promise<Object>} A guild emoji object
     */
    editGuildEmoji(guildID, emojiID, options, reason) {
        options.reason = reason;
        return this.requestHandler.request("PATCH", Endpoints.GUILD_EMOJI(guildID, emojiID), true, options);
    }

    /**
     * Edit a guild member
     * @param {String} guildID The ID of the guild
     * @param {String} memberID The ID of the member (you can use "@me" if you are only editing the bot user's nickname)
     * @param {Object} options The properties to edit
     * @param {String?} [options.channelID] The ID of the voice channel to move the member to (must be in voice). Set to `null` to disconnect the member
     * @param {Date?} [options.communicationDisabledUntil] When the user's timeout should expire. Set to `null` to instantly remove timeout
     * @param {Boolean} [options.deaf] Server deafen the member
     * @param {Number} [options.flags] The guild member flag bit set
     * @param {Boolean} [options.mute] Server mute the member
     * @param {String} [options.nick] Set the member's server nickname, "" to remove
     * @param {Array<String>} [options.roles] The array of role IDs the member should have
     * @param {String} [reason] The reason to be displayed in audit logs
     * @returns {Promise<Member>}
     */
    editGuildMember(guildID, memberID, options, reason) {
        return this.requestHandler.request("PATCH", Endpoints.GUILD_MEMBER(guildID, memberID), true, {
            roles: options.roles?.filter((roleID, index) => options.roles.indexOf(roleID) === index),
            nick: options.nick,
            mute: options.mute,
            deaf: options.deaf,
            channel_id: options.channelID,
            communication_disabled_until: options.communicationDisabledUntil,
            flags: options.flags,
            reason: reason
        }).then((member) => new Member(member, this.guilds.get(guildID), this));
    }

    /**
     * Edits the guild's MFA level. Requires the guild to be owned by the bot user
     * @param {String} guildID The guild ID to edit the MFA level in
     * @param {Object} options The options for the request
     * @param {Number} options.level The new MFA level
     * @param {String} [options.reason] The reason to be displayed in audit logs
     * @returns {Promise<Number>} Returns the new MFA level
     */
    editGuildMFALevel(guildID, options) {
        return this.requestHandler.request("POST", Endpoints.GUILD_MFA_LEVEL(guildID), true, options).then((data) => data.level);
    }

    /**
     * Edits the onboarding flow of a guild, shown to new members
     * @param {String} guildID The ID of the guild
     * @param {Object} options The [guild onboarding](https://discord.com/developers/docs/resources/guild#guild-onboarding-object) object
     * @param {String} [options.reason] The reason to be displayed in audit logs
     * @returns {Promise<Object>} Resolves with the [guild onboarding object](https://discord.com/developers/docs/resources/guild#guild-onboarding-object)
     */
    editGuildOnboarding(guildID, options) {
        return this.requestHandler.request("PUT", Endpoints.GUILD_ONBOARDING(guildID), true, options);
    }

    /**
     * Edit a guild scheduled event
     * @param {String} guildID The guild ID where the event will be edited
     * @param {String} eventID The guild scheduled event ID to be edited
     * @param {Object} event The new guild scheduled event object
     * @param {String} [event.channelID] The channel ID of the event. If updating `entityType` to `3` (external), this **must** be set to `null`
     * @param {String} [event.description] The description of the event
     * @param {Object} [event.entityMetadata] The entity metadata for the scheduled event. This is required if updating `entityType` to `3` (external)
     * @param {String} [event.entityMetadata.location] Location of the event. This is required if updating `entityType` to `3` (external)
     * @param {Number} [event.entityType] The [entity type](https://discord.com/developers/docs/resources/guild-scheduled-event#guild-scheduled-event-object-guild-scheduled-event-entity-types) of the scheduled event
     * @param {String} [event.image] Base 64 encoded image for the event
     * @param {String} [event.name] The name of the event
     * @param {String} [event.privacyLevel] The privacy level of the event
     * @param {Date} [event.scheduledEndTime] The time when the scheduled event is scheduled to end. This is required if updating `entityType` to `3` (external)
     * @param {Date} [event.scheduledStartTime] The time the event will start
     * @param {Number} [event.status] The [status](https://discord.com/developers/docs/resources/guild-scheduled-event#guild-scheduled-event-object-guild-scheduled-event-status) of the scheduled event
     * @param {String} [reason] The reason to be displayed in audit logs
     * @returns {Promise<GuildScheduledEvent>}
     */
    editGuildScheduledEvent(guildID, eventID, event, reason) {
        return this.requestHandler.request("PATCH", Endpoints.GUILD_SCHEDULED_EVENT(guildID, eventID), true, {
            channel_id: event.channelID,
            description: event.description,
            entity_metadata: event.entityMetadata,
            entity_type: event.entityType,
            image: event.image,
            name: event.name,
            privacy_level: event.privacyLevel,
            scheduled_end_time: event.scheduledEndTime,
            scheduled_start_time: event.scheduledStartTime,
            status: event.status,
            reason: reason
        }).then((data) => new GuildScheduledEvent(data, this));
    }

    /**
     * Edit a guild sticker
     * @param {String} stickerID The ID of the sticker
     * @param {Object} options The properties to edit
     * @param {String} [options.description] The description of the sticker
     * @param {String} [options.name] The name of the sticker
     * @param {String} [options.tags] The Discord name of a unicode emoji representing the sticker's expression
     * @param {String} [reason] The reason to be displayed in audit logs
     * @returns {Promise<Object>} A sticker object
     */
    editGuildSticker(guildID, stickerID, options, reason) {
        options.reason = reason;
        return this.requestHandler.request("PATCH", Endpoints.GUILD_STICKER(guildID, stickerID), true, options);
    }

    /**
     * Edit a guild template
     * @param {String} guildID The ID of the guild
     * @param {String} code The template code
     * @param {Object} options The properties to edit
     * @param {String} [options.name] The name of the template
     * @param {String?} [options.description] The description for the template. Set to `null` to remove the description
     * @returns {Promise<GuildTemplate>}
     */
    editGuildTemplate(guildID, code, options) {
        return this.requestHandler.request("PATCH", Endpoints.GUILD_TEMPLATE_GUILD(guildID, code), true, options).then((template) => new GuildTemplate(template, this));
    }

    /**
     * Update a user's voice state - See [caveats](https://discord.com/developers/docs/resources/guild#modify-user-voice-state-caveats)
     * @param {String} guildID The ID of the guild
     * @param {Object} options The properties to edit
     * @param {String} options.channelID The ID of the channel the user is currently in
     * @param {Date?} [options.requestToSpeakTimestamp] Sets the user's request to speak - this can only be used when the `userID` param is "@me"
     * @param {Boolean} [options.suppress] Toggles the user's suppress state
     * @param {String} [userID="@me"] The user ID of the user to update
     * @returns {Promise}
     */
    editGuildVoiceState(guildID, options, userID = "@me") {
        return this.requestHandler.request("PATCH", Endpoints.GUILD_VOICE_STATE(guildID, userID), true, {
            channel_id: options.channelID,
            request_to_speak_timestamp: options.requestToSpeakTimestamp,
            suppress: options.suppress
        });
    }

    /**
     * Edit a guild welcome screen
     * @param {String} guildID The ID of the guild
     * @param {Object} [options] The properties to edit
     * @param {String?} [options.description] The description in the welcome screen
     * @param {Boolean} [options.enabled] Whether the welcome screen is enabled
     * @param {Array<Object>} [options.welcomeChannels] The list of channels in the welcome screen as an array
     * @param {String} options.welcomeChannels[].channelID The channel ID of the welcome channel
     * @param {String} options.welcomeChannels[].description The description of the welcome channel
     * @param {String?} options.welcomeChannels[].emojiID The emoji ID of the welcome channel
     * @param {String?} options.welcomeChannels[].emojiName The emoji name of the welcome channel
     * @returns {Promise<Object>}
     */
    editGuildWelcomeScreen(guildID, options) {
        return this.requestHandler.request("PATCH", Endpoints.GUILD_WELCOME_SCREEN(guildID), true, {
            description: options.description,
            enabled: options.enabled,
            welcome_channels: options.welcomeChannels.map((c) => {
                return {
                    channel_id: c.channelID,
                    description: c.description,
                    emoji_id: c.emojiID,
                    emoji_name: c.emojiName
                };
            })
        });
    }

    /**
     * Modify a guild's widget
     * @param {String} guildID The ID of the guild
     * @param {Object} options The widget object to modify (https://discord.com/developers/docs/resources/guild#modify-guild-widget)
     * @param {Boolean} [options.enabled] Whether the guild widget is enabled
     * @param {String?} [options.channel_id] The channel ID for the guild widget
     * @param {String?} [options.reason] The reason to be displayed in audit logs
     * @returns {Promise<Object>} A guild widget object
     */
    editGuildWidget(guildID, options) {
        return this.requestHandler.request("PATCH", Endpoints.GUILD_WIDGET_SETTINGS(guildID), true, options);
    }

    /**
     * Edit a message
     * @param {String} channelID The ID of the channel
     * @param {String} messageID The ID of the message
     * @param {String | Array | Object} content A string, array of strings, or object. If an object is passed:
     * @param {Object} [content.allowedMentions] A list of mentions to allow (overrides default)
     * @param {Boolean} [content.allowedMentions.everyone] Whether or not to allow @everyone/@here.
     * @param {Boolean | Array<String>} [content.allowedMentions.roles] Whether or not to allow all role mentions, or an array of specific role mentions to allow.
     * @param {Boolean | Array<String>} [content.allowedMentions.users] Whether or not to allow all user mentions, or an array of specific user mentions to allow.
     * @param {Array<Object>} [content.attachments] The files to attach to the message
     * @param {String} content.attachments[].id The ID of an attachment (set only when you want to update an attachment)
     * @param {Buffer} content.attachments[].file A buffer containing file data (set only when uploading new files)
     * @param {String} content.attachments[].filename What to name the file
     * @param {String} [content.attachments[].description] A description for the attachment
     * @param {Array<Object>} [content.components] An array of components. See [Discord's Documentation](https://discord.com/developers/docs/interactions/message-components#what-is-a-component) for object structure
     * @param {String} [content.content] A content string
     * @param {Array<Object>} [content.embeds] An array of embed objects. See [Discord's Documentation](https://discord.com/developers/docs/resources/channel#embed-object) for object structure
     * @param {Number} [content.flags] A number representing the flags to apply to the message. See [Discord's Documentation](https://discord.com/developers/docs/resources/channel#message-object-message-flags) for a list
     * @returns {Promise<Message>}
     */
    editMessage(channelID, messageID, content) {
        if(content !== undefined) {
            if(typeof content !== "object" || content === null) {
                content = {
                    content: "" + content
                };
            } else if(content.content !== undefined && typeof content.content !== "string") {
                content.content = "" + content.content;
            }
            if(content.content !== undefined || content.embeds || content.allowedMentions) {
                content.allowed_mentions = this._formatAllowedMentions(content.allowedMentions);
            }
        }

        const {files, attachments} = content.attachments ? this._processAttachments(content.attachments) : [];
        content.attachments = attachments;

        return this.requestHandler.request("PATCH", Endpoints.CHANNEL_MESSAGE(channelID, messageID), true, content, files).then((message) => new Message(message, this));
    }

    /**
     * Edit a guild role
     * @param {String} guildID The ID of the guild the role is in
     * @param {String} roleID The ID of the role
     * @param {Object} options The properties to edit
     * @param {Number} [options.color] The hex color of the role, in number form (ex: 0x3da5b3 or 4040115)
     * @param {Boolean} [options.hoist] Whether to hoist the role in the user list or not
     * @param {String} [options.icon] The role icon as a base64 data URI
     * @param {Boolean} [options.mentionable] Whether the role is mentionable or not
     * @param {String} [options.name] The name of the role
     * @param {BigInt | Number | String | Permission} [options.permissions] The role permissions
     * @param {String} [options.unicodeEmoji] The role's unicode emoji
     * @param {String} [reason] The reason to be displayed in audit logs
     * @returns {Promise<Role>}
     */
    editRole(guildID, roleID, options, reason) {
        options.unicode_emoji = options.unicodeEmoji;
        options.reason = reason;
        if(options.permissions !== undefined) {
            options.permissions = options.permissions instanceof Permission ? String(options.permissions.allow) : String(options.permissions);
        }
        return this.requestHandler.request("PATCH", Endpoints.GUILD_ROLE(guildID, roleID), true, options).then((role) => new Role(role, this.guilds.get(guildID)));
    }

    /**
     * Updates the role connection metadata
     * @param {Array<Object>} metadata An array of [role connection metadata objects](https://discord.com/developers/docs/resources/application-role-connection-metadata#application-role-connection-metadata-object)
     * @returns {Promise<Object[]>}
     */
    editRoleConnectionMetadata(metadata) {
        for(const meta of metadata) {
            meta.name_localizations = meta.nameLocalizations;
            meta.description_localizations = meta.descriptionLocalizations;
        }
        return this.requestHandler.request("PUT", Endpoints.ROLE_CONNECTION_METADATA(this.application.id), true, metadata).then((metadata) => metadata.map((meta) => ({
            ...meta,
            nameLocalizations: meta.name_localizations,
            descriptionLocalizations: meta.description_localizations
        })));
    }

    /**
     * Edit a guild role's position. Note that role position numbers are highest on top and lowest at the bottom.
     * @param {String} guildID The ID of the guild the role is in
     * @param {String} roleID The ID of the role
     * @param {Number} position The new position of the role
     * @returns {Promise}
     */
    editRolePosition(guildID, roleID, position) {
        if(guildID === roleID) {
            return Promise.reject(new Error("Cannot move default role"));
        }
        let roles = this.guilds.get(guildID).roles;
        const role = roles.get(roleID);
        if(!role) {
            return Promise.reject(new Error(`Role ${roleID} not found`));
        }
        if(role.position === position) {
            return Promise.resolve();
        }
        const min = Math.min(position, role.position);
        const max = Math.max(position, role.position);
        roles = roles.filter((role) => min <= role.position && role.position <= max && role.id !== roleID).sort((a, b) => a.position - b.position);
        if(position > role.position) {
            roles.push(role);
        } else {
            roles.unshift(role);
        }
        return this.requestHandler.request("PATCH", Endpoints.GUILD_ROLES(guildID), true, roles.map((role, index) => ({
            id: role.id,
            position: index + min
        })));
    }

    /**
     * Edit properties of the bot user
     * @param {Object} options The properties to edit
     * @param {String} [options.username] The new username
     * @param {String?} [options.avatar] The new avatar as a base64 data URI. Note: base64 strings alone are not base64 data URI strings
     * @param {String?} [options.banner] The new banner as a base64 data URI. Note: base64 strings alone are not base64 data URI strings
     * @returns {Promise<ExtendedUser>}
     */
    editSelf(options) {
        return this.requestHandler.request("PATCH", Endpoints.USER("@me"), true, options).then((data) => new ExtendedUser(data, this));
    }

    /**
     * Update a stage instance
     * @param {String} channelID The ID of the stage channel associated with the instance
     * @param {Object} options The properties to edit
     * @param {Number} [options.privacyLevel] The privacy level of the stage instance. 1 is public (deprecated), 2 is guild only
     * @param {String} [options.topic] The stage instance topic
     * @returns {Promise<StageInstance>}
     */
    editStageInstance(channelID, options) {
        return this.requestHandler.request("PATCH", Endpoints.STAGE_INSTANCE(channelID), true, options).then((instance) => new StageInstance(instance, this));
    }

    /**
     * Update the bot's status on all guilds
     * @param {String} [status] Sets the bot's status, either "online", "idle", "dnd", or "invisible"
     * @param {Array | Object} [activities] Sets the bot's activities. A single activity object is also accepted for backwards compatibility
     * @param {String} activities[].name The name of the activity
     * @param {Number} activities[].type The type of the activity. 0 is playing, 1 is streaming (Twitch only), 2 is listening, 3 is watching, 4 is custom status, 5 is competing in
     * @param {String} [activities[].url] The URL of the activity
     * @param {String} [activities[].state] The state of the activity - if using a custom status, this is the text to be shown to the users
     */
    editStatus(status, activities) {
        if(activities === undefined && typeof status === "object") {
            activities = status;
            status = undefined;
        }
        if(status) {
            this.presence.status = status;
        }
        if(activities === null) {
            activities = [];
        } else if(activities && !Array.isArray(activities)) {
            activities = [activities];
        }
        if(activities !== undefined) {
            this.presence.activities = activities;
        }

        this.shards.forEach((shard) => {
            shard.editStatus(status, activities);
        });
    }

    /**
     * Edit a webhook
     * @param {String} webhookID The ID of the webhook
     * @param {Object} options Webhook options
     * @param {String} [options.name] The new default name
     * @param {String?} [options.avatar] The new default avatar as a base64 data URI. Note: base64 strings alone are not base64 data URI strings
     * @param {String} [options.channelID] The new channel ID where webhooks should be sent to
     * @param {String} [token] The token of the webhook, used instead of the Bot Authorization token
     * @param {String} [reason] The reason to be displayed in audit logs
     * @returns {Promise<Object>} Resolves with a webhook object
     */
    editWebhook(webhookID, options, token, reason) {
        return this.requestHandler.request("PATCH", token ? Endpoints.WEBHOOK_TOKEN(webhookID, token) : Endpoints.WEBHOOK(webhookID), !token, {
            name: options.name,
            avatar: options.avatar,
            channel_id: options.channelID,
            reason: reason
        });
    }

    /**
     * Edit a webhook message
     * @param {String} webhookID The ID of the webhook
     * @param {String} token The token of the webhook
     * @param {String} messageID The ID of the message
     * @param {Object} options Webhook message edit options
     * @param {Object} [options.allowedMentions] A list of mentions to allow (overrides default)
     * @param {Boolean} [options.allowedMentions.everyone] Whether or not to allow @everyone/@here.
     * @param {Boolean} [options.allowedMentions.repliedUser] Whether or not to mention the author of the message being replied to.
     * @param {Boolean | Array<String>} [options.allowedMentions.roles] Whether or not to allow all role mentions, or an array of specific role mentions to allow.
     * @param {Boolean | Array<String>} [options.allowedMentions.users] Whether or not to allow all user mentions, or an array of specific user mentions to allow.
     * @param {Array<Object>} [options.attachments] The files to attach to the message
     * @param {String} options.attachments[].id The ID of an attachment (set only when you want to update an attachment)
     * @param {Buffer} options.attachments[].file A buffer containing file data (set only when uploading new files)
     * @param {String} options.attachments[].filename What to name the file
     * @param {String} [content.attachments[].description] A description for the attachment
     * @param {Array<Object>} [content.components] An array of components. See [Discord's Documentation](https://discord.com/developers/docs/interactions/message-components#what-is-a-component) for object structure
     * @param {String} [options.content] A content string
     * @param {Array<Object>} [options.embeds] An array of embed objects. See [Discord's Documentation](https://discord.com/developers/docs/resources/channel#embed-object) for object structure
     * @param {String} [options.threadID] The ID of the thread channel in the webhook's channel to edit the message in
     * @returns {Promise<Message>}
     */
    editWebhookMessage(webhookID, token, messageID, options) {
        let qs = "";
        if(options.threadID) {
            qs += "&thread_id=" + options.threadID;
        }
        if(options.allowedMentions) {
            options.allowed_mentions = this._formatAllowedMentions(options.allowedMentions);
        }

        const {files, attachments} = options.attachments ? this._processAttachments(options.attachments) : [];
        options.attachments = attachments;

        return this.requestHandler.request("PATCH", Endpoints.WEBHOOK_MESSAGE(webhookID, token, messageID) + (qs ? "?" + qs : ""), false, options, files).then((response) => new Message(response, this));
    }

    /**
     * Immediately ends a poll
     * @param {String} channelID The ID of the channel the poll is in
     * @param {String} messageID The ID of the message containing the poll
     * @returns {Promise<Message>}
     */
    endPoll(channelID, messageID) {
        return this.requestHandler.request("POST", Endpoints.CHANNEL_POLL_EXPIRE(channelID, messageID), true).then((data) => new Message(data, this));
    }

    /**
     * Execute a slack-style webhook
     * @param {String} webhookID The ID of the webhook
     * @param {String} token The token of the webhook
     * @param {Object} options Slack webhook options
     * @param {Boolean} [options.auth=false] Whether or not to authenticate with the bot token.
     * @param {String} [options.threadID] The ID of the thread channel in the webhook's channel to send the message to
     * @param {Boolean} [options.wait=false] Whether to wait for the server to confirm the message create or not
     * @returns {Promise}
     */
    executeSlackWebhook(webhookID, token, options) {
        const wait = !!options.wait;
        options.wait = undefined;
        const auth = !!options.auth;
        options.auth = undefined;
        const threadID = options.threadID;
        options.threadID = undefined;
        let qs = "";
        if(wait) {
            qs += "&wait=true";
        }
        if(threadID) {
            qs += "&thread_id=" + threadID;
        }
        return this.requestHandler.request("POST", Endpoints.WEBHOOK_TOKEN_SLACK(webhookID, token) + (qs ? "?" + qs : ""), auth, options);
    }

    /**
     * Execute a webhook
     * @param {String} webhookID The ID of the webhook
     * @param {String} token The token of the webhook
     * @param {Object} options Webhook execution options
     * @param {Object} [options.allowedMentions] A list of mentions to allow (overrides default)
     * @param {Boolean} [options.allowedMentions.everyone] Whether or not to allow @everyone/@here.
     * @param {Boolean | Array<String>} [options.allowedMentions.roles] Whether or not to allow all role mentions, or an array of specific role mentions to allow.
     * @param {Boolean | Array<String>} [options.allowedMentions.users] Whether or not to allow all user mentions, or an array of specific user mentions to allow.
     * @param {Array<String>} [options.appliedTags] The tags to apply to the created thread (available only in threads in thread-only channels)
     * @param {Array<Object>} [content.attachments] The files to attach to the message
     * @param {Buffer} content.attachments[].file A buffer containing file data
     * @param {String} content.attachments[].filename What to name the file
     * @param {String} [content.attachments[].description] A description for the attachment
     * @param {Boolean} [options.auth=false] Whether or not to authenticate with the bot token.
     * @param {String} [options.avatarURL] A URL for a custom avatar, defaults to webhook default avatar if not specified
     * @param {Array<Object>} [content.components] An array of components. See [Discord's Documentation](https://discord.com/developers/docs/interactions/message-components#what-is-a-component) for object structure
     * @param {String} [options.content] A content string
     * @param {Array<Object>} [options.embeds] An array of embed objects. See [Discord's Documentation](https://discord.com/developers/docs/resources/channel#embed-object) for object structure
     * @param {Number} [options.flags] A number representing the flags to apply to the message. See [Discord's Documentation](https://discord.com/developers/docs/resources/channel#message-object-message-flags) for a list
     * @param {String} [options.threadID] The ID of the thread channel in the webhook's channel to send the message to
     * @param {String} [options.threadName] The name of the thread created in a forum channel
     * @param {Boolean} [options.tts=false] Whether the message should be a TTS message or not
     * @param {String} [options.username] A custom username, defaults to webhook default username if not specified
     * @param {Boolean} [options.wait=false] Whether to wait for the server to confirm the message create or not
     * @returns {Promise<Message?>}
     */
    executeWebhook(webhookID, token, options) {
        let qs = "";
        if(options.wait) {
            qs += "&wait=true";
        }
        if(options.threadID) {
            qs += "&thread_id=" + options.threadID;
        }

        const {files, attachments} = options.attachments ? this._processAttachments(options.attachments) : [];

        return this.requestHandler.request("POST", Endpoints.WEBHOOK_TOKEN(webhookID, token) + (qs ? "?" + qs : ""), !!options.auth, {
            applied_tags: options.appliedTags,
            content: options.content,
            embeds: options.embeds,
            username: options.username,
            avatar_url: options.avatarURL,
            tts: options.tts,
            flags: options.flags,
            allowed_mentions: this._formatAllowedMentions(options.allowedMentions),
            components: options.components,
            attachments: attachments,
            thread_name: options.threadName
        }, files).then((response) => options.wait ? new Message(response, this) : undefined);
    }

    /**
     * Follow a NewsChannel in another channel. This creates a webhook in the target channel
     * @param {String} channelID The ID of the NewsChannel
     * @param {String} webhookChannelID The ID of the target channel
     * @param {String} [reason] The reason to be displayed in audit logs
     * @returns {Object} An object containing the NewsChannel's ID and the new webhook's ID
     */
    followChannel(channelID, webhookChannelID, reason) {
        return this.requestHandler.request("POST", Endpoints.CHANNEL_FOLLOW(channelID), true, {webhook_channel_id: webhookChannelID, reason: reason});
    }

    /**
     * Get all active threads in a guild
     * @param {String} guildID The ID of the guild
     * @returns {Promise<Object>} An object containing an array of `threads` and an array of `members`
     */
    getActiveGuildThreads(guildID) {
        return this.requestHandler.request("GET", Endpoints.THREADS_GUILD_ACTIVE(guildID), true).then((response) => {
            return {
                members: response.members.map((member) => new ThreadMember(member, this)),
                threads: response.threads.map((thread) => Channel.from(thread, this))
            };
        });
    }

    /**
     * Get data on the application associated with this bot account.
     * The returned data is similar to the `getOAuthApplication()` method with additional information.
     * @returns {Promise<Object>} The bot's application data. Refer to [Discord's Documentation](https://discord.com/developers/docs/resources/application#application-object) for object structure
     */
    getApplication() {
        return this.requestHandler.request("GET", Endpoints.APPLICATION, true);
    }

    /**
     * Join a voice channel
     * @param {String} channelID The ID of the voice channel
     * @param {Object} [options] VoiceConnection constructor options
     * @param {Object} [options.opusOnly] Skip opus encoder initialization. You should not enable this unless you know what you are doing
     * @param {Object} [options.shared] Whether the VoiceConnection will be part of a SharedStream or not
     * @param {Boolean} [options.selfMute] Whether the bot joins the channel muted or not
     * @param {Boolean} [options.selfDeaf] Whether the bot joins the channel deafened or not
     * @returns {Promise<VoiceConnection>} Resolves with a VoiceConnection
     */
    joinVoiceChannel(channelID, options = {}) {
        const channel = this.getChannel(channelID);
        if(!channel) {
            return Promise.reject(new Error("Channel not found"));
        }
        if(channel.guild?.members.has(this.user.id) && !(channel.permissionsOf(this.user.id).allow & Constants.Permissions.voiceConnect)) {
            return Promise.reject(new Error("Insufficient permission to connect to voice channel"));
        }
        this.shards.get(this.guildShardMap[this.channelGuildMap[channelID]] || 0).sendWS(Constants.GatewayOPCodes.VOICE_STATE_UPDATE, {
            guild_id: this.channelGuildMap[channelID] || null,
            channel_id: channelID || null,
            self_mute: options.selfMute || false,
            self_deaf: options.selfDeaf || false
        });
        options.opusOnly ??= this.options.opusOnly;
        return this.voiceConnections.join(this.channelGuildMap[channelID], channelID, options);
    }

    /**
     * Kick a user from a guild
     * @param {String} guildID The ID of the guild
     * @param {String} userID The ID of the user
     * @param {String} [reason] The reason to be displayed in audit logs
     * @returns {Promise}
     */
    kickGuildMember(guildID, userID, reason) {
        return this.requestHandler.request("DELETE", Endpoints.GUILD_MEMBER(guildID, userID), true, {
            reason
        });
    }

    /**
     * Leave a guild
     * @param {String} guildID The ID of the guild
     * @returns {Promise}
     */
    leaveGuild(guildID) {
        return this.requestHandler.request("DELETE", Endpoints.USER_GUILD("@me", guildID), true);
    }

    /**
     * Leave a thread
     * @param {String} channelID The ID of the thread channel
     * @param {String} [userID="@me"] The user ID of the user leaving
     * @returns {Promise}
     */
    leaveThread(channelID, userID = "@me") {
        return this.requestHandler.request("DELETE", Endpoints.THREAD_MEMBER(channelID, userID), true);
    }

    /**
     * Leaves a voice channel
     * @param {String} channelID The ID of the voice channel
     */
    leaveVoiceChannel(channelID) {
        if(!channelID || !this.channelGuildMap[channelID]) {
            return;
        }
        this.closeVoiceConnection(this.channelGuildMap[channelID]);
    }

    /**
     * Pin a message
     * @param {String} channelID The ID of the channel
     * @param {String} messageID The ID of the message
     * @returns {Promise}
     */
    pinMessage(channelID, messageID) {
        return this.requestHandler.request("PUT", Endpoints.CHANNEL_PIN(channelID, messageID), true);
    }

    /**
     * Begin pruning a guild
     * @param {String} guildID The ID of the guild
     * @param {Number} [options] The options to pass to prune members
     * @param {Boolean} [options.computePruneCount=true] Whether or not the number of pruned members should be returned. Discord discourages setting this to true for larger guilds
     * @param {Number} [options.days=7] The number of days of inactivity to prune for
     * @param {Array<String>} [options.includeRoles] An array of role IDs that members must have to be considered for pruning
     * @param {String} [options.reason] The reason to be displayed in audit logs
     * @returns {Promise<Number?>} If computePruneCount was true, resolves with the number of pruned members
     */
    pruneMembers(guildID, options = {}) {
        return this.requestHandler.request("POST", Endpoints.GUILD_PRUNE(guildID), true, {
            days: options.days,
            compute_prune_count: options.computePruneCount,
            include_roles: options.includeRoles,
            reason: options.reason
        }).then((data) => data.pruned);
    }

    /**
     * Purge previous messages in a channel with an optional filter (bot accounts only)
     * @param {String} channelID The ID of the channel
     * @param {Object} options Options for the request.
     * @param {String} [options.after] Get messages after this message ID
     * @param {String} [options.before] Get messages before this message ID
     * @param {Function} [options.filter] Optional filter function that returns a boolean when passed a Message object
     * @param {Number} options.limit The max number of messages to search through, -1 for no limit
     * @param {String} [options.reason] The reason to be displayed in audit logs
     * @returns {Promise<Number>} Resolves with the number of messages deleted
     */
    async purgeChannel(channelID, options) {
        if(typeof options.filter === "string") {
            const filter = options.filter;
            options.filter = (msg) => msg.content.includes(filter);
        }
        let limit = options.limit;
        if(typeof limit !== "number") {
            throw new TypeError(`Invalid limit: ${limit}`);
        }
        if(limit !== -1 && limit <= 0) {
            return 0;
        }
        const toDelete = [];
        let deleted = 0;
        let done = false;
        const checkToDelete = async () => {
            const messageIDs = (done && toDelete) || (toDelete.length >= 100 && toDelete.splice(0, 100));
            if(messageIDs) {
                deleted += messageIDs.length;
                await this.deleteMessages(channelID, messageIDs, options.reason);
                if(done) {
                    return deleted;
                }
                await sleep(1000);
                return checkToDelete();
            } else if(done) {
                return deleted;
            } else {
                await sleep(250);
                return checkToDelete();
            }
        };
        const del = async (_before, _after) => {
            const messages = await this.getMessages(channelID, {
                limit: 100,
                before: _before,
                after: _after
            });
            if(limit !== -1 && limit <= 0) {
                done = true;
                return;
            }
            for(const message of messages) {
                if(limit !== -1 && limit <= 0) {
                    break;
                }
                if(message.timestamp < Date.now() - 1209600000) { // 14d * 24h * 60m * 60s * 1000ms
                    done = true;
                    return;
                }
                if(!options.filter || options.filter(message)) {
                    toDelete.push(message.id);
                }
                if(limit !== -1) {
                    limit--;
                }
            }
            if((limit !== -1 && limit <= 0) || messages.length < 100) {
                done = true;
                return;
            }
            await del((_before || !_after) && messages[messages.length - 1].id, _after && messages[0].id);
        };
        await del(options.before, options.after);
        return checkToDelete();
    }
    /**
     * Remove a reaction from a message
     * @param {String} channelID The ID of the channel
     * @param {String} messageID The ID of the message
     * @param {String} reaction The reaction (Unicode string if Unicode emoji, `emojiName:emojiID` if custom emoji)
     * @param {String} [userID="@me"] The ID of the user to remove the reaction for
     * @returns {Promise}
     */

    removeMessageReaction(channelID, messageID, reaction, userID) {
        if(reaction === decodeURI(reaction)) {
            reaction = encodeURIComponent(reaction);
        }
        return this.requestHandler.request("DELETE", Endpoints.CHANNEL_MESSAGE_REACTION_USER(channelID, messageID, reaction, userID || "@me"), true);
    }

    /**
     * Remove all reactions from a message for a single emoji.
     * @param {String} channelID The ID of the channel
     * @param {String} messageID The ID of the message
     * @param {String} reaction The reaction (Unicode string if Unicode emoji, `emojiName:emojiID` if custom emoji)
     * @returns {Promise}
     */
    removeMessageReactionEmoji(channelID, messageID, reaction) {
        if(reaction === decodeURI(reaction)) {
            reaction = encodeURIComponent(reaction);
        }
        return this.requestHandler.request("DELETE", Endpoints.CHANNEL_MESSAGE_REACTION(channelID, messageID, reaction), true);
    }

    /**
     * Remove all reactions from a message
     * @param {String} channelID The ID of the channel
     * @param {String} messageID The ID of the message
     * @returns {Promise}
     */
    removeMessageReactions(channelID, messageID) {
        return this.requestHandler.request("DELETE", Endpoints.CHANNEL_MESSAGE_REACTIONS(channelID, messageID), true);
    }

    /**
     * Search for guild members by partial nickname/username
     * @param {String} guildID The ID of the guild
     * @param {String} query The query string to match username(s) and nickname(s) against
     * @param {Number} [limit=1] The maximum number of members you want returned, capped at 100
     * @returns {Promise<Array<Member>>}
     */
    searchGuildMembers(guildID, query, limit) {
        return this.requestHandler.request("GET", Endpoints.GUILD_MEMBERS_SEARCH(guildID), true, {
            query,
            limit
        }).then((members) => {
            const guild = this.guilds.get(guildID);
            return members.map((member) => new Member(member, guild, this));
        });
    }

    _formatAllowedMentions(allowed) {
        if(!allowed) {
            return this.options.allowedMentions;
        }
        const result = {
            parse: []
        };
        if(allowed.everyone) {
            result.parse.push("everyone");
        }
        if(allowed.roles === true) {
            result.parse.push("roles");
        } else if(Array.isArray(allowed.roles)) {
            if(allowed.roles.length > 100) {
                throw new Error("Allowed role mentions cannot exceed 100.");
            }
            result.roles = allowed.roles;
        }
        if(allowed.users === true) {
            result.parse.push("users");
        } else if(Array.isArray(allowed.users)) {
            if(allowed.users.length > 100) {
                throw new Error("Allowed user mentions cannot exceed 100.");
            }
            result.users = allowed.users;
        }
        if(allowed.repliedUser !== undefined) {
            result.replied_user = allowed.repliedUser;
        }
        return result;
    }

    _formatImage(url, format, size) {
        if(!format || !Constants.ImageFormats.includes(format.toLowerCase())) {
            format = url.includes("/a_") ? "gif" : this.options.defaultImageFormat;
        }
        if(!size || size < Constants.ImageSizeBoundaries.MINIMUM || size > Constants.ImageSizeBoundaries.MAXIMUM || (size & (size - 1))) {
            size = this.options.defaultImageSize;
        }
        return `${Endpoints.CDN_URL}${url}.${format}?size=${size}`;
    }

    _processAttachments(attachments) {
        if(!attachments) {
            return {};
        }
        const files = [];
        const resultAttachments = [];

        attachments.forEach((attachment, idx) => {
            if(attachment.id) {
                resultAttachments.push(attachment);
            } else {
                files.push({
                    fieldName: `files[${idx}]`,
                    file: attachment.file,
                    name: attachment.filename
                });

                resultAttachments.push({
                    ...attachment,
                    file: undefined,
                    id: idx
                });
            }
        });

        return {
            files: files.length ? files : undefined,
            attachments: resultAttachments
        };
    }

    toString() {
        return `[Client ${this.user.id}]`;
    }

    toJSON(props = []) {
        return Base.prototype.toJSON.call(this, [
            "application",
            "bot",
            "channelGuildMap",
            "gatewayURL",
            "guilds",
            "guildShardMap",
            "lastConnect",
            "lastReconnectDelay",
            "options",
            "presence",
            "privateChannelMap",
            "privateChannels",
            "ready",
            "reconnectAttempts",
            "requestHandler",
            "shards",
            "startTime",
            "unavailableGuilds",
            "users",
            "voiceConnections",
            ...props
        ]);
    }
}

module.exports = Client;
