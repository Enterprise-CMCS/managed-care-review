/**
 * Network Configuration and Access Control
 * 
 * This file contains all network-related configuration including:
 * - IP allowlists
 * - CIDR blocks
 * - Security group rules
 * - VPC configurations
 */

/**
 * SSH Access Control List
 * IP addresses allowed to SSH into bastion hosts and VMs
 */
export const SSH_ACCESS_IPS = {
  // CMS Office Networks
  CMS_OFFICE_1: '34.196.35.156/32',
  CMS_OFFICE_2: '73.170.112.247/32',
  
  // VPN Ranges
  CMS_VPN: '172.58.0.0/16',
  
  // Individual Developer IPs (should be rotated regularly)
  DEVELOPER_1: '162.218.226.179/32',
  DEVELOPER_2: '66.108.108.206/32',
  DEVELOPER_3: '207.153.23.192/32',
  
  // IPv6 Access
  DEVELOPER_IPV6: '2601:483:5300:22cf:e1a1:88e9:46b7:2c49/128',
} as const;

/**
 * Get all SSH access IPs as an array
 */
export function getAllSshAccessIps(): string[] {
  return Object.values(SSH_ACCESS_IPS).filter(ip => !ip.includes(':'));
}

/**
 * Get all SSH access IPv6 addresses
 */
export function getSshAccessIpv6(): string[] {
  return Object.values(SSH_ACCESS_IPS).filter(ip => ip.includes(':'));
}

/**
 * CloudFront Geo Restrictions
 * Countries allowed to access the application
 */
export const GEO_RESTRICTIONS = {
  ALLOWED_COUNTRIES: ['US'],
  BLOCKED_COUNTRIES: [] as string[],
} as const;

/**
 * VPC CIDR Blocks by Environment
 */
export const VPC_CIDRS = {
  DEV: '10.0.0.0/16',
  VAL: '10.1.0.0/16',
  PROD: '10.2.0.0/16',
  EPHEMERAL: '10.3.0.0/16',
} as const;

/**
 * Security Group Port Configurations
 */
export const PORTS = {
  SSH: 22,
  HTTP: 80,
  HTTPS: 443,
  POSTGRES: 5432,
  REDIS: 6379,
  ELASTICSEARCH: 9200,
} as const;

/**
 * DNS Configuration
 */
export const DNS_CONFIG = {
  PRIVATE_HOSTED_ZONE: 'mcr.internal',
  PUBLIC_DOMAIN: process.env.PUBLIC_DOMAIN || 'managedcarereview.cms.gov',
} as const;

/**
 * NAT Gateway Configuration
 */
export const NAT_CONFIG = {
  // Number of NAT gateways per environment
  GATEWAYS_BY_STAGE: {
    dev: 1,
    val: 1,
    prod: 2, // High availability
    ephemeral: 0, // Cost savings
  },
} as const;