import {DatabaseSettings, sqlValue, TableAuthExtensionData, TableData, TableRulesExtensionData} from "teenybase"
import {authFields, baseFields, createdTrigger} from "teenybase/scaffolds/fields";

const userTable: TableData = {
    name: "users",
    autoSetUid: true,
    fields: [
        ...baseFields,
        ...authFields,
    ],
    indexes: [{fields: "role COLLATE NOCASE"}],
    extensions: [
        {
            name: "rules",
            listRule: "(auth.uid == id) | auth.role ~ '%admin' | meta->>'$.pvt'!=true",
            viewRule: "(auth.uid == id) | auth.role ~ '%admin'",
            createRule: "(auth.uid == null & role == 'guest') | (auth.role ~ '%admin' & role != 'superadmin')",
            updateRule: "(auth.uid == id & role == new.role & meta == new.meta) | (auth.role ~ '%admin' & new.role != 'superadmin' & (role != 'superadmin' | auth.role = 'superadmin'))",
            deleteRule: "auth.role ~ '%admin' & role !~ '%admin'",
        } as TableRulesExtensionData,
        {
            name: "auth",
            passwordType: "sha256",
            passwordCurrentSuffix: "Current",
            passwordConfirmSuffix: "Confirm",
            jwtSecret: "$JWT_SECRET_USERS",
            jwtTokenDuration: 3 * 60 * 60,
            maxTokenRefresh: 4,
            emailTemplates: {
                verification: {
                    variables: {
                        message_title: 'Email Verification',
                        message_description: 'Welcome to {{APP_NAME}}. Click the button below to verify your email address.',
                        message_footer: 'If you did not request this, please ignore this email.',
                        action_text: 'Verify Email',
                        action_link: '{{APP_URL}}#/verify-email/{{TOKEN}}',
                    }
                },
                passwordReset: {
                    variables: {
                        message_title: 'Password Reset',
                        message_description: 'Click the button below to reset the password for your {{APP_NAME}} account.',
                        message_footer: 'If you did not request this, you can safely ignore this email.',
                        action_text: 'Reset Password',
                        action_link: '{{APP_URL}}#/reset-password/{{TOKEN}}',
                    }
                }
            }
        } as TableAuthExtensionData,
    ],
    triggers: [
        createdTrigger,
    ],
}

const couplesTable: TableData = {
    name: "couples",
    autoSetUid: true,
    fields: [
        ...baseFields,
        {name: "inviter_id", type: "relation", sqlType: "text", notNull: true, foreignKey: {table: "users", column: "id"}},
        {name: "partner_id", type: "relation", sqlType: "text", foreignKey: {table: "users", column: "id"}},
        {name: "invite_code", type: "text", sqlType: "text", notNull: true, unique: true},
        {name: "status", type: "text", sqlType: "text", notNull: true, default: sqlValue("pending")},
    ],
    indexes: [
        {fields: "inviter_id"},
        {fields: "partner_id"},
        {fields: "invite_code"},
    ],
    extensions: [
        {
            name: "rules",
            listRule: "auth.uid != null",
            viewRule: "auth.uid != null",
            createRule: "auth.uid != null & inviter_id == auth.uid",
            updateRule: "auth.uid != null & (inviter_id == auth.uid | partner_id == auth.uid | partner_id == null)",
            deleteRule: "auth.uid != null & (inviter_id == auth.uid | partner_id == auth.uid)",
        } as TableRulesExtensionData,
    ],
    triggers: [createdTrigger],
}

const swipesTable: TableData = {
    name: "swipes",
    autoSetUid: true,
    fields: [
        ...baseFields,
        {name: "user_id", type: "relation", sqlType: "text", notNull: true, foreignKey: {table: "users", column: "id"}},
        {name: "couple_id", type: "relation", sqlType: "text", notNull: true, foreignKey: {table: "couples", column: "id"}},
        {name: "tmdb_id", type: "number", sqlType: "integer", notNull: true},
        {name: "media_type", type: "text", sqlType: "text", notNull: true, default: sqlValue("movie")},
        {name: "direction", type: "text", sqlType: "text", notNull: true},
    ],
    indexes: [
        {fields: "user_id"},
        {fields: "couple_id"},
        {fields: "tmdb_id"},
    ],
    extensions: [
        {
            name: "rules",
            listRule: "auth.uid != null",
            viewRule: "auth.uid != null",
            createRule: "auth.uid != null & user_id == auth.uid",
            updateRule: "false",
            deleteRule: "auth.uid != null & user_id == auth.uid",
        } as TableRulesExtensionData,
    ],
    triggers: [createdTrigger],
}

const matchesTable: TableData = {
    name: "matches",
    autoSetUid: true,
    fields: [
        ...baseFields,
        {name: "couple_id", type: "relation", sqlType: "text", notNull: true, foreignKey: {table: "couples", column: "id"}},
        {name: "tmdb_id", type: "number", sqlType: "integer", notNull: true},
        {name: "media_type", type: "text", sqlType: "text", notNull: true, default: sqlValue("movie")},
        {name: "movie_data", type: "json", sqlType: "json", notNull: true},
        {name: "watched", type: "bool", sqlType: "boolean", default: sqlValue(false)},
    ],
    indexes: [
        {fields: "couple_id"},
        {fields: "tmdb_id"},
    ],
    extensions: [
        {
            name: "rules",
            listRule: "auth.uid != null",
            viewRule: "auth.uid != null",
            createRule: "auth.uid != null",
            updateRule: "auth.uid != null",
            deleteRule: "auth.uid != null",
        } as TableRulesExtensionData,
    ],
    triggers: [createdTrigger],
}

const userServicesTable: TableData = {
    name: "user_services",
    autoSetUid: true,
    fields: [
        ...baseFields,
        {name: "user_id", type: "relation", sqlType: "text", notNull: true, foreignKey: {table: "users", column: "id"}},
        {name: "services", type: "json", sqlType: "json", notNull: true},
    ],
    indexes: [
        {fields: "user_id"},
    ],
    extensions: [
        {
            name: "rules",
            listRule: "auth.uid != null",
            viewRule: "auth.uid != null",
            createRule: "auth.uid != null & user_id == auth.uid",
            updateRule: "auth.uid != null & user_id == auth.uid",
            deleteRule: "auth.uid != null & user_id == auth.uid",
        } as TableRulesExtensionData,
    ],
    triggers: [createdTrigger],
}

const kvStoreTable: TableData = {
    name: "kv_store",
    autoSetUid: false,
    fields: [
        {name: "key", type: "text", sqlType: "text", notNull: true, primary: true},
        {name: "value", type: "json", sqlType: "json", notNull: true},
        {name: "expire", type: "date", sqlType: "timestamp"},
    ],
    extensions: [],
}

export default {
    tables: [userTable, couplesTable, swipesTable, matchesTable, userServicesTable, kvStoreTable],
    appName: "StreamSwipe",
    appUrl: "http://localhost:5174",
    jwtSecret: "$JWT_SECRET_MAIN",

    email: {
        from: "StreamSwipe <noreply@example.com>",
        tags: ["streamswipe"],
        variables: {
            company_name: "StreamSwipe",
            company_copyright: "StreamSwipe",
            company_address: "",
            support_email: "support@example.com",
            company_url: "http://localhost:5174",
        },
        mailgun: {
            MAILGUN_API_SERVER: "$MAILGUN_API_SERVER",
            MAILGUN_API_KEY: "$MAILGUN_API_KEY",
            MAILGUN_WEBHOOK_SIGNING_KEY: "$MAILGUN_WEBHOOK_SIGNING_KEY",
            MAILGUN_WEBHOOK_ID: "streamswipe",
            DISCORD_MAILGUN_NOTIFY_WEBHOOK: "$DISCORD_WEBHOOK"
        },
    },
} satisfies DatabaseSettings
