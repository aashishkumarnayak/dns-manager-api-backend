const mongoose = require('mongoose');

const dnsRecordSchema = new mongoose.Schema({
  domain: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['A', 'AAAA', 'CNAME', 'MX', 'NS', 'PTR', 'SOA', 'SRV', 'TXT', 'DNSSEC'],
    required: true
  },
  value: {
    type: String,
    required: true
  },
  ttl: {
    type: Number,
    default: 3600 // Default TTL (Time to Live) in seconds
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
});

const DnsRecord = mongoose.model('DnsRecord', dnsRecordSchema);

module.exports = DnsRecord;
