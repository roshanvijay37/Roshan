# EDGE IMPORT PROJECT - INTERVIEW ANSWERS (PART 2)

## 6. DATABASE DESIGN - MONGODB & SQL SERVER

### MongoDB Usage (Metadata & State Management)

**Purpose:**
- Import job metadata
- Workflow state tracking
- File processing status
- Error tracking
- Audit logs

**Collections:**
```
- ImportJobs: Job metadata, status, timestamps
- ImportFiles: File information, location, size
- ImportMessages: Individual record status
- WorkflowState: Current processing state
- ErrorLogs: Validation and processing errors
- AuditTrail: User actions and system events
```

**Document Structure Example:**
```json
{
  "_id": "guid",
  "portal": "corpId",
  "userId": 12345,
  "fileId": "guid",
  "fileName": "goals_import.csv",
  "status": "processing",
  "totalRecords": 1000,
  "validRecords": 950,
  "errorRecords": 50,
  "createdDate": "2024-01-01T10:00:00Z",
  "workflow_type_id": 1,
  "default_culture_id": 1
}
```

**MongoDB Advantages:**
- Flexible schema for varying metadata
- Fast writes for status updates
- Document model fits job structure
- Easy to query by status/date
- Horizontal scaling

### SQL Server Usage (Business Data)

**Purpose:**
- Production business data
- Staging tables for bulk operations
- Relational integrity
- Complex queries and reporting
- Transactional consistency

**Database Architecture:**

**1. Staging Tables (Temporary):**
```sql
CREATE TABLE #GoalStagingEntity (
    DocumentId UNIQUEIDENTIFIER,
    FileId UNIQUEIDENTIFIER,
    UserId INT,
    GoalEntityId VARCHAR(100),
    GoalEntityType VARCHAR(50),
    GoalTitle NVARCHAR(1000),
    GoalDescription NVARCHAR(MAX),
    StartDate DATETIME,
    EndDate DATETIME,
    ParentGoalEntityId VARCHAR(100),
    State VARCHAR(50),
    Errors NVARCHAR(MAX)
)
```

**2. Production Tables:**
```sql
- Users: User master data
- Goals: Goal records
- GoalTasks: Task components
- GoalTargets: Target components
- GoalComments: Comments
- GoalHistory: Audit trail
```

**3. Stored Procedures:**
- `load_snapshot_documents.sql`
- `delete_snapshot_documents.sql`
- `get_corp_setting.sql`
- Custom validation procedures

### Data Access Patterns

**1. Dapper (Micro-ORM):**
```csharp
public async Task<IEnumerable<GoalStagingEntity>> GetGoalStagingEntitiesAsync(
    string portal, Guid fileId, ISet<string> documentIds, ISet<string> entityIds)
{
    using var connection = new SqlConnection(connectionString);
    var sql = "SELECT * FROM GoalStagingEntity WHERE FileId = @FileId";
    return await connection.QueryAsync<GoalStagingEntity>(sql, new { FileId = fileId });
}
```

**2. Entity Framework Core:**
```csharp
// Used in some workers for complex queries
services.AddDbContext<GoalsContext>(options =>
    options.UseSqlServer(connectionString));
```

**3. Parasql (SQL Script Management):**
- Embedded SQL scripts as resources
- Type-safe parameter binding
- Script versioning

### Hybrid Strategy Benefits

**MongoDB for:**
- High-volume status updates
- Flexible metadata
- Fast reads for UI
- Temporary data
- Event sourcing

**SQL Server for:**
- Business-critical data
- ACID transactions
- Complex joins
- Referential integrity
- Reporting and analytics

### Data Consistency

**Eventual Consistency:**
- MongoDB updated first (job status)
- SQL Server updated second (business data)
- Reconciliation jobs for discrepancies
- Idempotency keys prevent duplicates

**Transaction Boundaries:**
- MongoDB: Single document atomicity
- SQL Server: Multi-table transactions
- No distributed transactions (2PC avoided)
- Compensating transactions for rollback

### Performance Optimizations

**MongoDB:**
- Indexes on portal, fileId, status, createdDate
- Compound indexes for common queries
- TTL indexes for automatic cleanup
- Read preference: primary for consistency

**SQL Server:**
- Clustered indexes on primary keys
- Non-clustered indexes on foreign keys
- Filtered indexes for active records
- Columnstore indexes for reporting
- Table partitioning by date

**Bulk Operations:**
```csharp
// Bulk insert to staging
SqlBulkCopy bulkCopy = new SqlBulkCopy(connection);
bulkCopy.DestinationTableName = "#GoalStagingEntity";
bulkCopy.BatchSize = 1000;
await bulkCopy.WriteToServerAsync(dataTable);
```

---

## 7. MONITORING & TROUBLESHOOTING - GRAFANA/SPLUNK

### Grafana Dashboards

**1. RabbitMQ Metrics Dashboard:**
- Queue depth and growth rate
- Message publish/consume rates
- Consumer utilization
- Connection count
- Memory usage
- Disk space

**2. MongoDB Metrics Dashboard:**
- Operations per second
- Query execution time
- Connection pool usage
- Replication lag
- Disk I/O
- Cache hit ratio

**3. Application Metrics:**
- Import job throughput
- Processing time per record
- Error rates by type
- Worker health status
- API response times

### Prometheus Integration

**Metrics Collection:**
```csharp
// Custom metrics exposed
- import_jobs_total
- import_records_processed
- import_errors_total
- import_duration_seconds
- worker_active_count
- queue_depth_gauge
```

**Scraping Configuration:**
- Prometheus scrapes metrics endpoints
- 15-second scrape interval
- Retention: 15 days
- Alerting rules configured

### Splunk Logging

**Log Queries:**

**1. Goals Import Worker Logs:**
```
index=csod_logs Component=perf-goals-goalsimport-worker
```

**2. Edge Import Framework Logs:**
```
index=csod_logs ProcessName=Goals.Import.Console sourcetype=edgeimport_log
```

**3. Error Analysis:**
```
index=csod_logs ProcessName=Goals.Import.Console level=ERROR
| stats count by error_kind
| sort -count
```

**4. Performance Analysis:**
```
index=csod_logs ProcessName=Goals.Import.Console
| transaction fileId
| stats avg(duration) p95(duration) p99(duration)
```

### Structured Logging

**NLog Configuration:**
```json
{
  "Logging": {
    "Targets": {
      "FileTargets": [{
        "Name": "f",
        "FileName": "${var:baseDirAndAppID}/app.json",
        "Layout": "${cornerstone-layout-default}",
        "ArchiveEvery": "Day",
        "MaxArchiveFiles": 14
      }]
    }
  }
}
```

**Log Format:**
```json
{
  "timestamp": "2024-01-01T10:00:00Z",
  "level": "INFO",
  "logger": "app",
  "message": "Processing batch",
  "correlationId": "guid",
  "portal": "corpId",
  "fileId": "guid",
  "batchSize": 1000,
  "duration": 1234
}
```

### Troubleshooting Workflow

**1. Identify Issue:**
- Grafana alerts trigger
- User reports problem
- Automated health checks fail

**2. Check Dashboards:**
- RabbitMQ: Queue backup?
- MongoDB: Slow queries?
- Application: Error spike?

**3. Splunk Investigation:**
```
index=csod_logs fileId="<guid>"
| transaction correlationId
| table timestamp, level, message, error_kind
```

**4. Correlation ID Tracing:**
- Single ID tracks request across services
- Follow message through entire workflow
- Identify exact failure point

**5. Common Issues & Solutions:**

**Queue Backup:**
- Check worker health
- Scale workers horizontally
- Increase batch size
- Check downstream service availability

**High Error Rate:**
- Query Splunk for error patterns
- Check validation rule changes
- Verify data quality
- Review recent deployments

**Slow Processing:**
- Check database performance
- Review query execution plans
- Check network latency
- Verify resource utilization

**Memory Issues:**
- Check batch sizes
- Review object disposal
- Monitor GC pressure
- Check for memory leaks

### Alerting Rules

**Critical Alerts:**
- Worker down > 5 minutes
- Queue depth > 10,000 messages
- Error rate > 10%
- Processing time > 2x baseline

**Warning Alerts:**
- Queue depth > 5,000 messages
- Error rate > 5%
- Processing time > 1.5x baseline
- Disk space < 20%

### Log Download API
```
http://laxqap-coiw1001:8001/api/DownloadLogs?process=Goals.Import.Console
```
- Download logs for specific process
- Time range filtering
- Compressed archive format

---

## 8. SECURITY PRACTICES

### Token Management

**1. Internal Token Provider:**
```csharp
services.AddSingleton<IInternalTokenProvider, InternalTokenRefreshService>();
```

**Features:**
- Automatic token refresh
- Token caching
- Expiration tracking
- Thread-safe operations

**2. Token Request Settings:**
```csharp
services.AddTokenRequestSettingsFromLambda(config, (obj) =>
{
    obj.ApiKey = serviceDefinition.Identifier.ServiceKey;
    obj.Description = serviceDefinition.Identifier.ServiceDescription;
});
```

### AWS STS (Security Token Service)

**Role Assumption:**
```csharp
services.AddStsAWSService<IAmazonLambda>("perf-iam-adfs-role", 
    ResourceNameFormatters.PrefixWithRegionAccountShortAliasResourceName);
```

**Benefits:**
- Temporary credentials (15 min - 12 hours)
- No long-lived credentials in code
- Automatic rotation
- Least privilege access
- Audit trail in CloudTrail

**Implementation:**
```csharp
// Cornerstone.AwsSts library
public class AwsStsService
{
    public async Task<Credentials> AssumeRoleAsync(string roleArn)
    {
        var request = new AssumeRoleRequest
        {
            RoleArn = roleArn,
            RoleSessionName = "EdgeImportSession",
            DurationSeconds = 3600
        };
        var response = await stsClient.AssumeRoleAsync(request);
        return response.Credentials;
    }
}
```

### AWS KMS (Key Management Service)

**Encryption at Rest:**
```csharp
// AWSSDK.KeyManagementService
public async Task<byte[]> EncryptDataAsync(byte[] plaintext, string keyId)
{
    var request = new EncryptRequest
    {
        KeyId = keyId,
        Plaintext = new MemoryStream(plaintext)
    };
    var response = await kmsClient.EncryptAsync(request);
    return response.CiphertextBlob.ToArray();
}
```

**Use Cases:**
- Database connection strings
- API keys
- Sensitive configuration
- File encryption

**Envelope Encryption:**
1. Generate data key from KMS
2. Encrypt data with data key
3. Encrypt data key with master key
4. Store encrypted data + encrypted key
5. Decrypt key with KMS when needed
6. Decrypt data with decrypted key

### Authentication & Authorization

**1. Service-to-Service Authentication:**
```csharp
services.AddSingleton<IServiceDefinition>(serviceDefinition);
services.AddRestWebServicesClient(config);
```

**2. User Authentication:**
- JWT tokens for API calls
- Token validation middleware
- Claims-based authorization
- Role-based access control (RBAC)

**3. API Key Management:**
```csharp
obj.ApiKey = serviceDefinition.Identifier.ServiceKey;
```
- Unique key per service
- Stored in AWS Parameter Store
- Rotated regularly
- Audited access

### Secrets Management

**1. AWS Parameter Store:**
```
/edgeimport/prod/database/connectionstring
/edgeimport/prod/rabbitmq/password
/edgeimport/prod/api/keys/goalservice
```

**2. Configuration Service:**
```json
{
  "ConfigurationOptions": {
    "UseConfigurationService": true
  }
}
```
- Centralized secret storage
- Version control
- Access logging
- Encryption at rest

### Network Security

**1. VPC Configuration:**
- Private subnets for workers
- Public subnets for load balancers
- Security groups restrict traffic
- NACLs for subnet-level control

**2. TLS/SSL:**
- All external communication encrypted
- Certificate management
- TLS 1.2+ only
- Strong cipher suites

**3. RabbitMQ Security:**
```conf
# rabbitmq.conf
loopback_users.guest = true  # Guest only from localhost
# TLS configuration available
```

### Data Protection

**1. PII Handling:**
- Anonymization for non-production
- Masking in logs
- Encryption at rest
- Access controls

**2. Audit Logging:**
- All data access logged
- User actions tracked
- System events recorded
- Immutable audit trail

**3. Data Retention:**
- Automated cleanup policies
- Compliance with regulations
- Secure deletion
- Backup encryption

### Security Best Practices

**1. Least Privilege:**
- Minimal IAM permissions
- Role-based access
- Service-specific roles
- Regular permission audits

**2. Defense in Depth:**
- Multiple security layers
- Network segmentation
- Application-level security
- Database-level security

**3. Security Monitoring:**
- AWS GuardDuty
- CloudTrail analysis
- Security alerts
- Incident response

**4. Vulnerability Management:**
- Regular dependency updates
- Security scanning (CodeAnalysis)
- Penetration testing
- Patch management

