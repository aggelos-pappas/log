import type { ErrorCode } from '../../errors/catalog/index'

export type SocialAccountPlatform = 'YOUTUBE' | 'TIKTOK' | 'INSTAGRAM' | 'LINKEDIN' | 'TWITTER' | 'FACEBOOK' | 'UPWORK' | 'REDDIT'
export type SocialAccountStatus = 'ACTIVE' | 'WARMING' | 'LIMITED' | 'PAUSED' | 'NEEDS_LOGIN' | 'CHECKPOINT' | 'RESTRICTED' | 'BANNED' | 'DEAD' | 'DEACTIVATED'
export type AgencyListingCondition = 'NEW' | 'USED_LIKE_NEW' | 'USED_GOOD' | 'USED_FAIR'
export type AgencyListingRunResult = 'DRY_RUN' | 'PUBLISHED' | 'UNCONFIRMED' | 'BLOCKED' | 'NEEDS_PERSON' | 'FAILED'
export type AgencyListingStatus = 'ACTIVE' | 'UNDER_REVIEW' | 'DUPLICATE_TAKEDOWN' | 'DELETED_BY_FB' | 'POLICY_VIOLATION' | 'COMMERCE_BAN' | 'CHECKPOINT_REQUIRED' | 'SOLD' | 'RETRY_EXHAUSTED' | 'UNKNOWN' | 'DRAFT' | 'READY' | 'PUBLISHING' | 'UNCONFIRMED' | 'FAILED' | 'BLOCKED' | 'REMOVED' | 'ACCOUNT_LOST' | 'REPLACED'
export type AgencyConversationLeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'BOOKED' | 'LOST' | 'SPAM'
export type AgencyChannel = 'SMS' | 'FACEBOOK_MARKETPLACE'
export type AgencyMessageAiStatus = 'DRAFT' | 'APPROVED' | 'SENT' | 'DISMISSED' | 'FAILED'
export type AgencyMessageSentBy = 'PERSON' | 'VA' | 'AI' | 'SYSTEM'
export type AgencyGroupJoinStatus = 'NOT_MEMBER' | 'REQUESTED' | 'MEMBER' | 'UNKNOWN'

interface StoredRow {
  id: string
  name?: string
  createdAt: string
  updatedAt: string
  deletedAt?: string
  position: number
  searchVector?: string
}

export interface SocialAccount extends StoredRow {
  storageOrigins?: unknown
  platform?: SocialAccountPlatform
  accessToken?: string
  accountName?: string
  warmupStartedAt?: string
  purchasedAt?: string
  proxyExitCountry?: string
  warmedAt?: string
  accountStatus?: SocialAccountStatus
  statusChangedAt?: string
  deviceProfile?: unknown
  lifecycleState?: string
  statusDetail?: string
  proxyCheckedAt?: string
  vendorUserAgent?: string
  linkedTo?: string
  dailyListingCap?: number
  activeHoursEnd?: number
  profileSetAt?: string
  sessionState?: string
  sessionCheckedAt?: string
  activeHoursStart?: number
  vendorListingUrl?: string
  homeCountry?: string
  proxyExitIp?: string
  phoneNumber?: string
  profileName?: string
  profileNamedAt?: string
  marketplaceLocationAt?: string
  homeCity?: string
  proxy?: string
  vendorOrderId?: string
  messengerPin?: string
  coverPhoto?: string
  emailPassword?: string
  email?: string
  browserDriver?: string
  profilePhoto?: string
  vendor?: string
  lastPostedAt?: string
  cookies?: unknown
  adsPowerProfileId?: string
  statusReason?: string
  password?: string
  totpSecret?: string
  profileUrl?: string
  copyStyle?: string
}

export interface AgencyListing extends StoredRow {
  supersededById?: string
  category?: string
  title?: string
  generation?: number
  priceCurrency?: string
  description?: string
  agencyLeadId?: string
  lastErrorCode?: string
  copyVersionId?: string
  lastError?: string
  htmlReceiptUrl?: string
  offerId?: string
  locationPostalCode?: string
  condition?: AgencyListingCondition
  screenshotUrl?: string
  price?: number
  listingId?: string
  lastCheckedAt?: string
  clicksCount?: number
  locationCountry?: string
  copyVersions?: unknown
  replacementReason?: string
  lastRunResult?: AgencyListingRunResult
  parentListingId?: string
  photos?: unknown
  photoHashes?: unknown
  nextCheckAt?: string
  status?: AgencyListingStatus
  publishedAt?: string
  locationCity?: string
  listingUrl?: string
  lastRunAt?: string
  rootListingId?: string
  locationQuery?: string
  campaignId?: string
  replacesId?: string
  socialAccountId?: string
}

export interface AgencyConversation extends StoredRow {
  status?: string
  aiTookOver?: boolean
  facebookListingId?: string
  agencyListingId?: string
  buyerName?: string
  autoReplied?: boolean
  blasterConversationId?: string
  agencyPhoneId?: string
  latestDirection?: string
  lastScannedAt?: string
  messageCount?: number
  blasterNumber?: string
  agencyLeadId?: string
  peerPhone?: string
  buyerEmail?: string
  lastReadAt?: string
  facebookThreadId?: string
  buyerFacebookId?: string
  listingTitle?: string
  createdByMemberId?: string
  leadStatus?: AgencyConversationLeadStatus
  pairKey?: string
  latestMessageId?: string
  latestMessageAt?: string
  latestPreview?: string
  unreadCount?: number
  respondedAt?: string
  socialAccountId?: string
  channel?: AgencyChannel
  buyerPhone?: string
  buyerProfileUrl?: string
  agencyProspectId?: string
}

export interface AgencyMessage extends StoredRow {
  errorMessage?: string
  isRead?: boolean
  body?: string
  toNumber?: string
  aiStatus?: AgencyMessageAiStatus
  telnyxMessageId?: string
  fromNumber?: string
  channel?: AgencyChannel
  facebookMessageId?: string
  sentBy?: AgencyMessageSentBy
  direction?: string
  errorCode?: string
  media?: unknown
  senderName?: string
  aiOriginalText?: string
  sentAt?: string
  status?: string
  messageKey?: string
  agencyConversationId?: string
}

export interface AgencyGroup extends StoredRow {
  joinStatusReason?: string
  joinRequestedAt?: string
  groupUrl?: string
  lastReadReason?: string
  readCursor?: unknown
  membersLabel?: string
  facebookGroupId?: string
  lastCheckedAt?: string
  joinStatus?: AgencyGroupJoinStatus
  lastReadAt?: string
  joinSubmission?: unknown
  socialAccountId?: string
}

export interface AgencyGroupPost extends StoredRow {
  commentCount?: number
  text?: string
  postedAt?: string
  authorName?: string
  commentsReadCount?: number
  facebookPostId?: string
  authorUrl?: string
  facebookGroupId?: string
  feedbackId?: string
  commentsReadAt?: string
  permalink?: string
  authorFacebookId?: string
  agencyGroupId?: string
}

export interface AgencyGroupComment extends StoredRow {
  permalink?: string
  facebookPostId?: string
  commentedAt?: string
  authorFacebookId?: string
  authorName?: string
  authorUrl?: string
  facebookCommentId?: string
  authorAnonymous?: boolean
  replyCount?: number
  text?: string
  parentCommentId?: string
  depth?: number
  agencyGroupPostId?: string
  feedbackId?: string
}

export type FilterIs = 'NULL' | 'NOT_NULL'

export interface FieldFilter<T> {
  eq?: T | null
  neq?: T | null
  in?: T[] | null
  is?: FilterIs | null
}

export type RowFilter<Row> = { [K in keyof Row]?: FieldFilter<NonNullable<Row[K]>> | null } & {
  and?: RowFilter<Row>[] | null
  or?: RowFilter<Row>[] | null
}

export type RowWrite<Row> = { [K in keyof Row]?: Row[K] | null }

interface ObjectShape<Row> {
  row: Row
  filter: RowFilter<Row>
  create: RowWrite<Row>
  update: RowWrite<Row>
}

export interface AccountObjects {
  socialAccounts: ObjectShape<SocialAccount>
  agencyListings: ObjectShape<AgencyListing>
  agencyConversations: ObjectShape<AgencyConversation>
  agencyMessages: ObjectShape<AgencyMessage>
  agencyGroups: ObjectShape<AgencyGroup>
  agencyGroupPosts: ObjectShape<AgencyGroupPost>
  agencyGroupComments: ObjectShape<AgencyGroupComment>
}

export type AccountObject = keyof AccountObjects

export interface AccountStore {
  list<K extends AccountObject>(object: K, filter?: AccountObjects[K]['filter']): Promise<AccountObjects[K]['row'][]>
  get<K extends AccountObject>(object: K, id: string): Promise<AccountObjects[K]['row'] | null>
  create<K extends AccountObject>(object: K, data: AccountObjects[K]['create']): Promise<AccountObjects[K]['row']>
  update<K extends AccountObject>(object: K, id: string, data: AccountObjects[K]['update']): Promise<AccountObjects[K]['row']>
  loginSecrets(accountId: string): Promise<LoginSecrets | null>
}

export interface LoginSecrets {
  email: string | null
  password: string | null
  totpSecret: string | null
  messengerPin: string | null
}

export class AccountStoreError extends Error {
  readonly code: ErrorCode

  constructor(code: ErrorCode, message: string) {
    super(message)
    this.code = code
  }
}
