const DnsRecord = require("../models/dnsRecord");
const mongoose = require("mongoose");
// Controller functions for handling DNS record requests

const csv = require("csv-parser");
const fs = require("fs");
const DnsRecordModel = require("../models/dnsRecord");

const AWS = require("../config/awsConfig");

// Create a new Route 53 object
const route53 = new AWS.Route53();




exports.bulkUpload = async (req, res) => {
  try {
    // Ensure the request contains a file
    if (!req.file) {
      return res.status(400).json({ message: "No files were uploaded" });
    }

    // Ensure the uploaded file is a CSV file
    if (req.file.mimetype !== "text/csv") {
      return res.status(400).json({ message: "Only CSV files are allowed" });
    }

    // Read and process the CSV file
    const records = [];
    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on("data", (data) => {
        // Construct a new DNS record object from CSV data
        const record = new DnsRecordModel({
          domain: data.domain,
          type: data.type,
          value: data.value,
          ttl: data.ttl,
          user: req.user, // Associate the record with the authenticated user
        });
        records.push(record);
      })
      .on("end", async () => {
        // Save all records to the database
        await DnsRecordModel.insertMany(records);

        // Call the Route 53 API to create DNS records
        records.forEach(async (record) => {
          const params = {
            ChangeBatch: {
              Changes: [
                {
                  Action: "CREATE",
                  ResourceRecordSet: {
                    Name: record.domain,
                    Type: record.type,
                    TTL: record.ttl,
                    ResourceRecords: [{ Value: record.value }],
                  },
                },
              ],
            },
            HostedZoneId: process.env.HOSTED_ZONE_ID,
          };

          try {
            await route53.changeResourceRecordSets(params).promise();
          } catch (error) {
            console.error("Error creating DNS record in Route 53:", error);
          }
        });

        // Remove the temporary file after processing
        fs.unlinkSync(req.file.path);
        res.status(200).json({ message: "Bulk upload successful" });
      });
  } catch (error) {
    console.error("Error uploading CSV file:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getAllRecords = async (req, res) => {
  try {
    // Fetch DNS records belonging to the authenticated user
    const records = await DnsRecord.find({ user: req.user });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createRecord = async (req, res) => {
  const { domain, type, value, ttl } = req.body;

  // Save record to MongoDB
  const record = new DnsRecord({
    domain,
    type,
    value,
    ttl,
    user: req.user,
  });

  try {
    // Save record to MongoDB
    const newRecord = await record.save();

    // Construct parameters for creating DNS record in Route 53
    const params = {
      ChangeBatch: {
        Changes: [
          {
            Action: "CREATE",
            ResourceRecordSet: {
              Name: domain,
              Type: type,
              TTL: ttl,
              ResourceRecords: [{ Value: value }],
            },
          },
        ],
      },
      HostedZoneId: process.env.HOSTED_ZONE_ID,
    };

    // Call the Route 53 API to create the DNS record
    await route53.changeResourceRecordSets(params).promise();

    // Return the newly created record
    res.status(201).json(newRecord);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.getRecordById = async (req, res) => {
  try {
    const record = await DnsRecord.findOne({
      _id: req.params.id,
      user: req.user,
    });
    if (record == null) {
      return res.status(404).json({ message: "Record not found" });
    }
    res.json(record);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.updateRecord = async (req, res) => {
  try {
    // Find the record in MongoDB and update it
    const updatedRecord = await DnsRecord.findOneAndUpdate(
      { _id: req.params.id, user: req.user }, // Ensure record belongs to the authenticated user
      req.body,
      { new: true }
    );

    // Construct parameters for updating DNS record in Route 53
    const { domain, type, value, ttl } = req.body;
    const params = {
      ChangeBatch: {
        Changes: [
          {
            Action: "UPSERT", // Update existing record or create if not exists
            ResourceRecordSet: {
              Name: domain,
              Type: type,
              TTL: ttl,
              ResourceRecords: [{ Value: value }],
            },
          },
        ],
      },
      HostedZoneId: process.env.HOSTED_ZONE_ID,
    };

    // Call the Route 53 API to update the DNS record
    await route53.changeResourceRecordSets(params).promise();

    // Return the updated record
    res.json(updatedRecord);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.deleteRecord = async (req, res) => {
  try {
    // Construct parameters for deleting DNS record in Route 53
    const recordToDelete = await DnsRecord.findById(req.params.id); // Find the record to delete

    const params = {
      ChangeBatch: {
        Changes: [
          {
            Action: "DELETE", // Delete the existing record
            ResourceRecordSet: {
              Name: recordToDelete.domain, // Use the domain name of the record to delete
              Type: recordToDelete.type, // Use the record type of the record to delete
              TTL: recordToDelete.ttl, // Use the TTL of the record to delete
              ResourceRecords: [{ Value: recordToDelete.value }], // Specify the resource record value
            },
          },
        ],
      },
      HostedZoneId: process.env.HOSTED_ZONE_ID,
    };

    // Call the Route 53 API to delete the DNS record
    await route53.changeResourceRecordSets(params).promise();
    // Find the record in MongoDB and delete it
    await DnsRecord.findOneAndDelete({ _id: req.params.id, user: req.user }); // Ensure record belongs to the authenticated user
    res.json({ message: "Record deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getRecordsWithFilter = async (req, res) => {
  try {
    // Extract filter parameters from request query
    const { domain, type, search } = req.query;

    // Construct query object based on filter parameters
    const query = { user: req.user };
    if (domain) {
      const domainSubstring = domain.toLowerCase(); // Convert substring to lowercase for case-insensitive search
      query.domain = { $regex: domainSubstring, $options: "i" }; // Use $regex for substring match
    }
    if (type) query.type = type;

    // Perform database query with filters
    const records = await DnsRecord.find(query);

    // Send filtered records as response
    res.json(records);
  } catch (error) {
    // Handle errors
    res.status(500).json({ message: error.message });
  }
};

// Controller functions for handling record type distribution and domain distribution
exports.getRecordTypeDistribution = async (req, res) => {
  try {
    // Aggregate to count the occurrences of each record type for the authenticated user
    const response = await DnsRecord.find({ user: req.user });
    const result = response.reduce((acc, curr) => {
      acc[curr.type] = (acc[curr.type] || 0) + 1;
      return acc;
    }, {});

    const recordTypeDistribution = Object.entries(result).map(
      ([type, count]) => ({ type, count })
    );

    res.json(recordTypeDistribution);
  } catch (error) {
    console.log("error is running");
    console.error("Error fetching record type distribution:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getDomainDistribution = async (req, res) => {
  try {
    const response = await DnsRecord.find({ user: req.user });

    // Create an object to store counts for each domain extension
    const domainCounts = {};

    // Iterate over the response array
    response.forEach((record) => {
      // Extract the domain extension
      const domainExtension = record.domain.split(".").pop();

      // If the domain extension is not already in the domainCounts object, initialize its count to 0
      if (!domainCounts[domainExtension]) {
        domainCounts[domainExtension] = 0;
      }

      // Increment the count for the domain extension
      domainCounts[domainExtension]++;
    });

    // Convert the domainCounts object to the desired array format
    const domaninDistribution = Object.keys(domainCounts).map((domain) => ({
      domain: `.${domain}`,
      count: domainCounts[domain],
    }));

    res.json(domaninDistribution);
  } catch (error) {
    console.error("Error fetching domain distribution:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};





