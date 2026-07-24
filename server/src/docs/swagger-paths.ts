/**
 * Central OpenAPI path definitions for Swagger.
 * All route docs are collected here; route files stay lean.
 * Generated/updated by scripts/extract-swagger.js
 */

/**
 * @swagger
 * /api/admin/serviceproviders:
 *   get:
 *     summary: Get all service providers
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of all service providers
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/admin/serviceproviderstats:
 *   get:
 *     summary: Get service provider statistics
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Service provider statistics
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/admin/providerdetails:
 *   get:
 *     summary: Get details of a specific service provider
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Service provider details
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/admin/customerstable:
 *   get:
 *     summary: Get customers table data
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Customers table data
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/admin/customerdetails:
 *   get:
 *     summary: Get details of a specific customer
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Customer details
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/admin/registeredusers:
 *   get:
 *     summary: Get all registered users
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of registered users
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/admin/fetchallscorecards:
 *   get:
 *     summary: Fetch all scorecards
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of all scorecards
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/admin/tradeboxwallet/tradeboxplans:
 *   get:
 *     summary: Get Tradebox wallet plans
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of Tradebox wallet plans
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/admin/tradeboxwallet/serviceproviderplans:
 *   get:
 *     summary: Get service provider plans for Tradebox wallet
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of service provider plans
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/admin/tradeboxwallet/totalamount:
 *   get:
 *     summary: Get total amount in Tradebox wallet
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Total wallet amount
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/admin/tradeboxwallet/calculategst:
 *   get:
 *     summary: Calculate GST for Tradebox wallet
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Calculated GST details
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/admin/tradeboxwallet/gstdatatable:
 *   get:
 *     summary: Get GST data table
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: GST data table
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/admin/rawallet/transaction-list:
 *   get:
 *     summary: Get RA wallet transaction list
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of RA wallet transactions
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/admin/tradeboxwallet/claimgst:
 *   post:
 *     summary: Claim GST from Tradebox wallet
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               claimDetails:
 *                 type: object
 *                 description: GST claim details
 *     responses:
 *       200:
 *         description: GST claimed successfully
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/admin/withdrawal/requests:
 *   get:
 *     summary: Get all withdrawal requests
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of withdrawal requests
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/admin/withdrawal/approve:
 *   post:
 *     summary: Approve a withdrawal request
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               withdrawalId:
 *                 type: string
 *                 description: ID of the withdrawal to approve
 *     responses:
 *       200:
 *         description: Withdrawal approved successfully
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/admin/withdrawal/reject:
 *   post:
 *     summary: Reject a withdrawal request
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               withdrawalId:
 *                 type: string
 *                 description: ID of the withdrawal to reject
 *     responses:
 *       200:
 *         description: Withdrawal rejected successfully
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/admin/withdrawal/process:
 *   post:
 *     summary: Process a withdrawal request
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               withdrawalId:
 *                 type: string
 *                 description: ID of the withdrawal to process
 *     responses:
 *       200:
 *         description: Withdrawal processed successfully
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/admin/allnotifications:
 *   get:
 *     summary: Get all notifications for admin
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of all notifications
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/admin/sendnotifications:
 *   post:
 *     summary: Send notifications
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Notification title
 *               message:
 *                 type: string
 *                 description: Notification message
 *               recipients:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of recipient IDs
 *     responses:
 *       200:
 *         description: Notifications sent successfully
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/admin/deletenotification:
 *   post:
 *     summary: Delete a notification
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notificationId:
 *                 type: string
 *                 description: ID of the notification to delete
 *     responses:
 *       200:
 *         description: Notification deleted successfully
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/admin/approveserviceprovider:
 *   post:
 *     summary: Approve a service provider
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               providerId:
 *                 type: string
 *                 description: ID of the service provider to approve
 *     responses:
 *       200:
 *         description: Service provider approved successfully
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/admin/approveevent:
 *   post:
 *     summary: Approve an event
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               eventId:
 *                 type: string
 *                 description: ID of the event to approve
 *     responses:
 *       200:
 *         description: Event approved successfully
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/admin/approveservice:
 *   post:
 *     summary: Approve a service
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               serviceId:
 *                 type: string
 *                 description: ID of the service to approve
 *     responses:
 *       200:
 *         description: Service approved successfully
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/admin/verifyserviceprovider:
 *   post:
 *     summary: Verify a service provider
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               providerId:
 *                 type: string
 *                 description: ID of the service provider to verify
 *     responses:
 *       200:
 *         description: Service provider verified successfully
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/admin/rejectserviceprovider:
 *   post:
 *     summary: Reject a service provider
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               providerId:
 *                 type: string
 *                 description: ID of the service provider to reject
 *     responses:
 *       200:
 *         description: Service provider rejected successfully
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/admin/rejectevent:
 *   post:
 *     summary: Reject an event
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               eventId:
 *                 type: string
 *                 description: ID of the event to reject
 *     responses:
 *       200:
 *         description: Event rejected successfully
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/admin/rejectservice:
 *   post:
 *     summary: Reject a service
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               serviceId:
 *                 type: string
 *                 description: ID of the service to reject
 *     responses:
 *       200:
 *         description: Service rejected successfully
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/admin/removeserviceprovider:
 *   post:
 *     summary: Remove a service provider
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               providerId:
 *                 type: string
 *                 description: ID of the service provider to remove
 *     responses:
 *       200:
 *         description: Service provider removed successfully
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/admin/deleteserviceprovider:
 *   post:
 *     summary: Delete a service provider
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               providerId:
 *                 type: string
 *                 description: ID of the service provider to delete
 *     responses:
 *       200:
 *         description: Service provider deleted successfully
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/admin/deletecustomer:
 *   post:
 *     summary: Delete a customer
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               customerId:
 *                 type: string
 *                 description: ID of the customer to delete
 *     responses:
 *       200:
 *         description: Customer deleted successfully
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/admin/approve-subscription:
 *   post:
 *     summary: Approve a subscription
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               subscriptionId:
 *                 type: string
 *                 description: ID of the subscription to approve
 *     responses:
 *       200:
 *         description: Subscription approved successfully
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/admin/activate-membership:
 *   post:
 *     summary: Activate a membership from admin
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               membershipId:
 *                 type: string
 *                 description: ID of the membership to activate
 *     responses:
 *       200:
 *         description: Membership activated successfully
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/admin/update-membership:
 *   post:
 *     summary: Update a membership
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               membershipId:
 *                 type: string
 *                 description: ID of the membership to update
 *               updates:
 *                 type: object
 *                 description: Membership update fields
 *     responses:
 *       200:
 *         description: Membership updated successfully
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/admin/deactivate-membership:
 *   delete:
 *     summary: Deactivate a membership
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Membership deactivated successfully
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/admin/recharge-wallet:
 *   post:
 *     summary: Recharge wallet manually
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 description: ID of the user whose wallet to recharge
 *               amount:
 *                 type: number
 *                 description: Amount to recharge
 *     responses:
 *       200:
 *         description: Wallet recharged successfully
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/admin/deduct-wallet:
 *   post:
 *     summary: Deduct wallet amount manually
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 description: ID of the user whose wallet to deduct from
 *               amount:
 *                 type: number
 *                 description: Amount to deduct
 *     responses:
 *       200:
 *         description: Wallet amount deducted successfully
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/admin/update-service-features:
 *   post:
 *     summary: Update service provider service features
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               providerId:
 *                 type: string
 *                 description: ID of the service provider
 *               features:
 *                 type: object
 *                 description: Service features to enable or update
 *     responses:
 *       200:
 *         description: Service features updated successfully
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/admin/removearticle:
 *   post:
 *     summary: Remove an article
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               articleId:
 *                 type: string
 *                 description: ID of the article to remove
 *     responses:
 *       200:
 *         description: Article removed successfully
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/admin/removeevent:
 *   post:
 *     summary: Remove an event
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               eventId:
 *                 type: string
 *                 description: ID of the event to remove
 *     responses:
 *       200:
 *         description: Event removed successfully
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/admin/removepodcast:
 *   post:
 *     summary: Remove a podcast
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               podcastId:
 *                 type: string
 *                 description: ID of the podcast to remove
 *     responses:
 *       200:
 *         description: Podcast removed successfully
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/admin/removevideo:
 *   post:
 *     summary: Remove a video
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               videoId:
 *                 type: string
 *                 description: ID of the video to remove
 *     responses:
 *       200:
 *         description: Video removed successfully
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/admin/removeservice:
 *   post:
 *     summary: Remove a service
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               serviceId:
 *                 type: string
 *                 description: ID of the service to remove
 *     responses:
 *       200:
 *         description: Service removed successfully
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/admin/createevent:
 *   post:
 *     summary: Create a new event
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Event image file
 *               title:
 *                 type: string
 *                 description: Event title
 *               description:
 *                 type: string
 *                 description: Event description
 *     responses:
 *       200:
 *         description: Event created successfully
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/admin/modelsnotapproved:
 *   get:
 *     summary: Get model portfolios not yet approved
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of unapproved model portfolios
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/admin/modelsapproved:
 *   get:
 *     summary: Get approved model portfolios
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of approved model portfolios
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/admin/update-commercials:
 *   put:
 *     summary: Update model portfolio commercials
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               portfolioId:
 *                 type: string
 *                 description: ID of the model portfolio
 *               commercials:
 *                 type: object
 *                 description: Updated commercial details
 *     responses:
 *       200:
 *         description: Commercials updated successfully
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/admin/lms-commercial:
 *   post:
 *     summary: Set LMS commercial configuration
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               commercialData:
 *                 type: object
 *                 description: LMS commercial configuration data
 *     responses:
 *       200:
 *         description: LMS commercial set successfully
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/admin/logout:
 *   post:
 *     summary: Admin logout
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Admin logged out successfully
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/admin/subadmin/create:
 *   post:
 *     summary: Create a new sub-admin
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Sub-admin name
 *               email:
 *                 type: string
 *                 description: Sub-admin email
 *               password:
 *                 type: string
 *                 description: Sub-admin password
 *               permissions:
 *                 type: object
 *                 description: Sub-admin permissions
 *     responses:
 *       200:
 *         description: Sub-admin created successfully
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/admin/subadmin/all:
 *   get:
 *     summary: Get all sub-admins
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of all sub-admins
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/admin/subadmin/{id}:
 *   get:
 *     summary: Get a sub-admin by ID
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Sub-admin ID
 *     responses:
 *       200:
 *         description: Sub-admin details
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Sub-admin not found
 */

/**
 * @swagger
 * /api/admin/subadmin/update/{id}:
 *   put:
 *     summary: Update a sub-admin by ID
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Sub-admin ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Updated sub-admin name
 *               email:
 *                 type: string
 *                 description: Updated sub-admin email
 *               permissions:
 *                 type: object
 *                 description: Updated sub-admin permissions
 *     responses:
 *       200:
 *         description: Sub-admin updated successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Sub-admin not found
 */

/**
 * @swagger
 * /api/admin/subadmin/delete/{id}:
 *   delete:
 *     summary: Delete a sub-admin by ID
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Sub-admin ID
 *     responses:
 *       200:
 *         description: Sub-admin deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Sub-admin not found
 */

/**
 * @swagger
 * /api/admin/update-provider-meta:
 *   post:
 *     summary: Update service provider metadata
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               providerId:
 *                 type: string
 *                 description: ID of the service provider
 *               meta:
 *                 type: object
 *                 description: Metadata fields to update
 *     responses:
 *       200:
 *         description: Provider metadata updated successfully
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/admin/createMPadmin:
 *   post:
 *     summary: Create a marketplace entry (admin)
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               marketplaceData:
 *                 type: object
 *                 description: Marketplace creation data
 *     responses:
 *       200:
 *         description: Marketplace created successfully
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/admin/showallmarketplace:
 *   get:
 *     summary: Get all marketplace entries
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of all marketplace entries
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/admin/deletemarketplaceId/{id}:
 *   delete:
 *     summary: Delete a marketplace entry by ID
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Marketplace entry ID
 *     responses:
 *       200:
 *         description: Marketplace entry deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Marketplace entry not found
 */

/**
 * @swagger
 * /api/aliceblue/sso-url:
 *   get:
 *     summary: Get SSO login URL for Alice Blue authentication
 *     tags: [Alice Blue]
 *     parameters:
 *       - in: query
 *         name: appCode
 *         required: false
 *         schema:
 *           type: string
 *         description: Optional app code for SSO
 *     responses:
 *       200:
 *         description: SSO URL generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     ssoUrl:
 *                       type: string
 *                     appCode:
 *                       type: string
 *       500:
 *         description: Failed to generate SSO URL
 */

/**
 * @swagger
 * /api/aliceblue/get-session:
 *   post:
 *     summary: Create user session after SSO login
 *     tags: [Alice Blue]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - authCode
 *             properties:
 *               userId:
 *                 type: string
 *                 description: User ID from SSO callback
 *               authCode:
 *                 type: string
 *                 description: Authorization code from SSO callback
 *     responses:
 *       200:
 *         description: Session created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     userId:
 *                       type: string
 *                     userSession:
 *                       type: string
 *                     clientId:
 *                       type: string
 *       400:
 *         description: Missing required fields or session creation failed
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/aliceblue/contract:
 *   get:
 *     summary: Get contract details by exchange and symbol
 *     tags: [Alice Blue]
 *     parameters:
 *       - in: query
 *         name: exchange
 *         required: true
 *         schema:
 *           type: string
 *           enum: [NSE, BSE, MCX]
 *         description: Exchange name
 *       - in: query
 *         name: symbol
 *         required: true
 *         schema:
 *           type: string
 *         description: Trading symbol
 *     responses:
 *       200:
 *         description: Contract details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     instrumentId:
 *                       type: string
 *                     token:
 *                       type: string
 *       400:
 *         description: Missing required parameters or invalid exchange
 *       404:
 *         description: Contract not found
 *       500:
 *         description: Failed to fetch contract
 */

/**
 * @swagger
 * /api/aliceblue/orders/place-order:
 *   post:
 *     summary: Place trading orders on Alice Blue
 *     tags: [Alice Blue]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *               required:
 *                 - exchange
 *                 - instrumentId
 *                 - transactionType
 *                 - quantity
 *                 - product
 *                 - orderComplexity
 *                 - orderType
 *                 - validity
 *               properties:
 *                 exchange:
 *                   type: string
 *                   description: Exchange (e.g., NSE, BSE, MCX)
 *                 instrumentId:
 *                   type: string
 *                   description: Instrument token/ID
 *                 transactionType:
 *                   type: string
 *                   enum: [BUY, SELL]
 *                 quantity:
 *                   type: number
 *                   description: Order quantity
 *                 product:
 *                   type: string
 *                   description: Product type (e.g., MIS, NRML, CNC)
 *                 orderComplexity:
 *                   type: string
 *                   description: Order complexity (e.g., REGULAR)
 *                 orderType:
 *                   type: string
 *                   description: Order type (e.g., LIMIT, MARKET)
 *                 validity:
 *                   type: string
 *                   description: Validity (e.g., DAY, IOC)
 *                 price:
 *                   type: string
 *                   description: Limit price
 *                 slTriggerPrice:
 *                   type: string
 *                   description: Stop-loss trigger price
 *                 disclosedQuantity:
 *                   type: number
 *                   description: Disclosed quantity
 *     responses:
 *       200:
 *         description: Order placed successfully
 *       400:
 *         description: Invalid order payload
 *       401:
 *         description: Unauthorized - Invalid or missing session
 *       500:
 *         description: Failed to place order
 */

/**
 * @swagger
 * /api/aliceblue/orders/book:
 *   get:
 *     summary: Get order book (all active orders)
 *     tags: [Alice Blue]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Order book retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 orders:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Unauthorized - Invalid or missing session
 *       500:
 *         description: Failed to fetch order book
 */

/**
 * @swagger
 * /api/aliceblue/orders/history:
 *   post:
 *     summary: Get order history by broker order ID
 *     tags: [Alice Blue]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - brokerOrderId
 *             properties:
 *               brokerOrderId:
 *                 type: string
 *                 description: Broker order ID
 *     responses:
 *       200:
 *         description: Order history retrieved successfully
 *       400:
 *         description: Missing broker order ID
 *       401:
 *         description: Unauthorized - Invalid or missing session
 *       500:
 *         description: Failed to fetch order history
 */

/**
 * @swagger
 * /api/aliceblue/orders/modify:
 *   post:
 *     summary: Modify existing order
 *     tags: [Alice Blue]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - brokerOrderId
 *             properties:
 *               brokerOrderId:
 *                 type: string
 *                 description: Broker order ID to modify
 *               quantity:
 *                 type: number
 *                 description: New quantity
 *               orderType:
 *                 type: string
 *                 description: New order type
 *               price:
 *                 type: string
 *                 description: New limit price
 *               slTriggerPrice:
 *                 type: string
 *                 description: New stop-loss trigger price
 *     responses:
 *       200:
 *         description: Order modified successfully
 *       400:
 *         description: Missing broker order ID
 *       401:
 *         description: Unauthorized - Invalid or missing session
 *       500:
 *         description: Failed to modify order
 */

/**
 * @swagger
 * /api/aliceblue/orders/cancel:
 *   post:
 *     summary: Cancel an order
 *     tags: [Alice Blue]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - brokerOrderId
 *             properties:
 *               brokerOrderId:
 *                 type: string
 *                 description: Broker order ID to cancel
 *     responses:
 *       200:
 *         description: Order cancelled successfully
 *       400:
 *         description: Missing broker order ID
 *       401:
 *         description: Unauthorized - Invalid or missing session
 *       500:
 *         description: Failed to cancel order
 */

/**
 * @swagger
 * /api/aliceblue/orders/trades:
 *   get:
 *     summary: Get trade book (executed trades)
 *     tags: [Alice Blue]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Trade book retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 trades:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Unauthorized - Invalid or missing session
 *       500:
 *         description: Failed to fetch trade book
 */

/**
 * @swagger
 * /api/aliceblue/orders/checkMargin:
 *   post:
 *     summary: Check margin requirement for a single order
 *     tags: [Alice Blue]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - exchange
 *               - instrumentId
 *               - transactionType
 *               - quantity
 *               - product
 *               - orderComplexity
 *               - orderType
 *             properties:
 *               exchange:
 *                 type: string
 *               instrumentId:
 *                 type: string
 *               transactionType:
 *                 type: string
 *                 enum: [BUY, SELL]
 *               quantity:
 *                 type: number
 *               product:
 *                 type: string
 *               orderComplexity:
 *                 type: string
 *               orderType:
 *                 type: string
 *               price:
 *                 type: string
 *               validity:
 *                 type: string
 *               slTriggerPrice:
 *                 type: string
 *     responses:
 *       200:
 *         description: Margin details retrieved successfully
 *       401:
 *         description: Unauthorized - Invalid or missing session
 *       500:
 *         description: Failed to check margin
 */

/**
 * @swagger
 * /api/aliceblue/orders/basket/margin:
 *   post:
 *     summary: Check margin requirement for basket of orders
 *     tags: [Alice Blue]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *               properties:
 *                 exchange:
 *                   type: string
 *                 tradingSymbol:
 *                   type: string
 *                 price:
 *                   type: string
 *                 qty:
 *                   type: number
 *                 product:
 *                   type: string
 *                 priceType:
 *                   type: string
 *                 triggerPrice:
 *                   type: string
 *                 transType:
 *                   type: string
 *                   enum: [BUY, SELL]
 *     responses:
 *       200:
 *         description: Basket margin details retrieved successfully
 *       401:
 *         description: Unauthorized - Invalid or missing session
 *       500:
 *         description: Failed to check basket margin
 */

/**
 * @swagger
 * /api/aliceblue/orders/exit/sno:
 *   post:
 *     summary: Exit bracket order
 *     tags: [Alice Blue]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *               required:
 *                 - orderNo
 *                 - orderComplexity
 *               properties:
 *                 orderNo:
 *                   type: string
 *                   description: Order number
 *                 orderComplexity:
 *                   type: string
 *                   description: Order complexity
 *     responses:
 *       200:
 *         description: Bracket order exited successfully
 *       401:
 *         description: Unauthorized - Invalid or missing session
 *       500:
 *         description: Failed to exit bracket order
 */

/**
 * @swagger
 * /api/auth/signin:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Sign in a user
 *     description: Authenticates a user (provider, user, or admin) by mobile number and role. Creates a session and returns a JWT token.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - number
 *               - loginAs
 *             properties:
 *               number:
 *                 type: string
 *                 description: The registered mobile number
 *                 example: "9876543210"
 *               loginAs:
 *                 type: string
 *                 enum: [user, provider, admin]
 *                 description: The role to log in as
 *                 example: "provider"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Login successful"
 *                 user:
 *                   type: object
 *                   description: User data object
 *                 token:
 *                   type: string
 *                   description: JWT authentication token
 *                 userExists:
 *                   type: boolean
 *                   example: true
 *                 expiresAt:
 *                   type: string
 *                   format: date-time
 *                   description: Token expiration timestamp
 *       400:
 *         description: Missing required fields or invalid loginAs value
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Number and loginAs are required"
 *       403:
 *         description: User not found or account disabled
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 userExists:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Service provider not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Failed to Signin"
 */

/**
 * @swagger
 * /api/auth/provider/signup:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Register a new service provider
 *     description: Registers a new service provider account with profile data and file uploads (certificate, company certificate, profile picture, company logo, Aadhaar, and PAN). Sends a welcome email and notifies the admin.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - data
 *             properties:
 *               data:
 *                 type: string
 *                 description: JSON stringified object containing provider registration details (RegName, name, email, number, city, state, regNumber, isSubProfile, masterID, companyName)
 *               certificate:
 *                 type: string
 *                 format: binary
 *                 description: Provider certificate file
 *               CompanyCertificate:
 *                 type: string
 *                 format: binary
 *                 description: Company certificate file
 *               profilePic:
 *                 type: string
 *                 format: binary
 *                 description: Profile picture file
 *               companyLogo:
 *                 type: string
 *                 format: binary
 *                 description: Company logo file
 *               aadhar:
 *                 type: string
 *                 format: binary
 *                 description: Aadhaar document file
 *               PAN:
 *                 type: string
 *                 format: binary
 *                 description: PAN card document file
 *     responses:
 *       200:
 *         description: Provider registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Provider SignedUp Successfully"
 *                 data:
 *                   type: object
 *                   description: The created provider record
 *       400:
 *         description: Missing data or master ID for sub profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "No Data provided"
 *       404:
 *         description: Master provider not found (for sub profile registration)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Master provider not found"
 *       409:
 *         description: User or provider already exists with the given number
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Provider already exists"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Failed to Signup"
 */

/**
 * @swagger
 * /api/auth/user/signup:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Register a new user
 *     description: Registers a new user account with personal details. Optionally creates a lead if a callbackUrl containing a service ID is provided.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - number
 *             properties:
 *               name:
 *                 type: string
 *                 description: Full name of the user
 *                 example: "John Doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email address
 *                 example: "john@example.com"
 *               number:
 *                 type: string
 *                 description: Mobile number
 *                 example: "9876543210"
 *               telegram:
 *                 type: string
 *                 description: Telegram handle (optional)
 *               dob:
 *                 type: string
 *                 description: Date of birth (optional)
 *               pannumber:
 *                 type: string
 *                 description: PAN number (optional)
 *               gender:
 *                 type: string
 *                 description: Gender (optional)
 *               aadhaarLast4:
 *                 type: string
 *                 description: Last 4 digits of Aadhaar (optional)
 *               callbackUrl:
 *                 type: string
 *                 description: URL-encoded callback URL containing a service ID for lead creation (optional)
 *     responses:
 *       200:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "User Signed Up Successfully"
 *                 userId:
 *                   type: string
 *                   description: The created user's ID
 *       400:
 *         description: Missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Name, email, and phone number are required"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Failed to add user"
 */

/**
 * @swagger
 * /api/auth/checkforuser:
 *   get:
 *     tags:
 *       - Authentication
 *     summary: Check if a user exists
 *     description: Checks whether a user or service provider exists in the system by email address.
 *     parameters:
 *       - in: query
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         description: The email address to look up
 *         example: "john@example.com"
 *     responses:
 *       200:
 *         description: User found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "User Found"
 *       400:
 *         description: No email provided
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "No Data provided"
 *       500:
 *         description: User not found or internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Failed to Get User"
 */

/**
 * @swagger
 * /api/auth/resetpassword:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Reset user password
 *     description: Resets the password for a user or service provider after OTP verification. Requires the OTP to have been verified beforehand.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - newPassword
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: The email of the account to reset
 *                 example: "john@example.com"
 *               newPassword:
 *                 type: string
 *                 description: The new password to set
 *                 example: "newSecurePassword123"
 *     responses:
 *       200:
 *         description: Password reset successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Password reset successfull"
 *       400:
 *         description: Missing email or password
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "No Email provided"
 *       404:
 *         description: User not found in any database
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "User not found in any database"
 *       500:
 *         description: OTP not verified or internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Failed to Reset Password"
 */

/**
 * @swagger
 * /api/auth/requestotp:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Request an OTP via email
 *     description: Sends a one-time password to the provided email address for verification during registration. Fails if the email is already registered or an OTP is already pending.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email address to send OTP to
 *                 example: "john@example.com"
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "OTP sent"
 *       500:
 *         description: Email missing, user already exists, OTP already pending, or internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Failed to send OTP"
 */

/**
 * @swagger
 * /api/auth/requestoptformobile:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Request an OTP via SMS
 *     description: Sends a one-time password to the provided mobile number via SMS for verification. Rate-limited to one OTP per minute.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - number
 *             properties:
 *               number:
 *                 type: string
 *                 description: Mobile number to send OTP to
 *                 example: "9876543210"
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "OTP sent successfully to your mobile number"
 *       400:
 *         description: Mobile number not provided
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Mobile number is required"
 *       429:
 *         description: OTP already sent recently
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "OTP already sent recently. Try again after a minute."
 *       500:
 *         description: Failed to send OTP or internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Something went wrong while sending OTP"
 */

/**
 * @swagger
 * /api/auth/requestpassresetotp:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Request an OTP for password reset
 *     description: Sends a one-time password to the provided email address specifically for the password reset flow. Fails if an OTP is already pending.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email address to send password reset OTP to
 *                 example: "john@example.com"
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "OTP sent"
 *       500:
 *         description: Email missing, OTP already pending, or internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Failed to send OTP"
 */

/**
 * @swagger
 * /api/auth/checkotp:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Verify an email OTP
 *     description: Verifies the one-time password submitted by the user against the stored OTP for the given email address. Marks the OTP record as verified upon success.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - otp
 *               - email
 *             properties:
 *               otp:
 *                 type: string
 *                 description: The OTP code to verify
 *                 example: "1234"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: The email the OTP was sent to
 *                 example: "john@example.com"
 *               key:
 *                 type: string
 *                 description: Optional session key for tracking verification state
 *     responses:
 *       200:
 *         description: OTP verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "OTP Verified"
 *       400:
 *         description: OTP expired
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "OTP Expired"
 *       500:
 *         description: OTP not provided, OTP incorrect, or internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "OTP not correct"
 */

/**
 * @swagger
 * /api/auth/checkotpnumber:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Verify a mobile OTP
 *     description: Verifies the one-time password submitted by the user against the stored OTP for the given mobile number. Includes rate limiting with a 15-minute lockout after 5 failed attempts. Returns a short-lived JWT token and user existence status on success.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - otp
 *               - number
 *             properties:
 *               otp:
 *                 type: string
 *                 description: The OTP code to verify
 *                 example: "1234"
 *               number:
 *                 type: string
 *                 description: The mobile number the OTP was sent to
 *                 example: "9876543210"
 *               key:
 *                 type: string
 *                 description: Optional session key for tracking verification state
 *     responses:
 *       200:
 *         description: OTP verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: Short-lived JWT token (10 minutes)
 *                 userExists:
 *                   type: boolean
 *                   description: Whether the user already has an account
 *                 role:
 *                   type: string
 *                   enum: [user, provider, admin, guest]
 *                   description: The role of the existing user, or guest if not registered
 *                 category:
 *                   type: string
 *                   description: Provider category (only present for providers)
 *       400:
 *         description: OTP expired
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "OTP Expired"
 *       429:
 *         description: Too many incorrect attempts, account temporarily locked
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Too many incorrect attempts. Try again in 900s"
 *       500:
 *         description: OTP not provided, OTP incorrect, or internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Failed to Verify"
 */

/**
 * @swagger
 * /api/auth/checkrefreshotp:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Verify OTP status on page refresh
 *     description: Checks if an OTP associated with a given session key has already been verified. Used to restore verification state after a page refresh.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - key
 *             properties:
 *               key:
 *                 type: string
 *                 description: The session key stored during OTP verification
 *     responses:
 *       200:
 *         description: OTP verification state confirmed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "OTP Verified"
 *                 email:
 *                   type: string
 *                   description: The email associated with the verified OTP
 *       500:
 *         description: Verification record not found, not verified, or internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Failed to Verify"
 */

/**
 * @swagger
 * /api/auth/getuserdata:
 *   get:
 *     tags:
 *       - Authentication
 *     summary: Get user data by ID
 *     description: Retrieves service provider data by their ID. Returns user data excluding the password field.
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The MongoDB ObjectId of the service provider
 *         example: "64f1a2b3c4d5e6f7a8b9c0d1"
 *     responses:
 *       200:
 *         description: User data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "User Found"
 *                 user:
 *                   type: object
 *                   description: Service provider data (password excluded)
 *       500:
 *         description: No ID provided, user not found, or internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Failed to fetch user"
 */

/**
 * @swagger
 * /api/auth/getdocuments:
 *   get:
 *     tags:
 *       - Authentication
 *     summary: Download a Digilocker document
 *     description: Downloads a document from Digilocker via the SurePass API using the provided client ID and file ID. Returns the document as a binary file download.
 *     parameters:
 *       - in: query
 *         name: clientId
 *         required: true
 *         schema:
 *           type: string
 *         description: The Digilocker client ID
 *       - in: query
 *         name: fileId
 *         required: true
 *         schema:
 *           type: string
 *         description: The Digilocker file ID
 *     responses:
 *       200:
 *         description: Document downloaded successfully
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Missing clientId or fileId parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Missing parameters"
 *       405:
 *         description: Method not allowed (non-GET request)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Method Not Allowed"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Internal Server Error"
 */

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Log out the current user
 *     description: Logs out the currently authenticated user by deleting their active session. Requires a valid Bearer token in the Authorization header.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Logged out successfully"
 *       400:
 *         description: Token not provided
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Token is required"
 *       404:
 *         description: Session not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Session not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Failed to logout"
 */

/**
 * @swagger
 * /api/course/courses/create:
 *   post:
 *     summary: Create a new course (draft)
 *     tags: [Courses]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - data
 *             properties:
 *               data:
 *                 type: string
 *                 description: >
 *                   JSON stringified course data containing title, subtitle, description,
 *                   language (en|hi|other), level (beginner|intermediate|advanced), price,
 *                   currency, segment, keyFeatures, bonusFeatures, instructorId, instructorName,
 *                   instructorEmail, instructorAvatar
 *               thumbnail:
 *                 type: string
 *                 format: binary
 *                 description: Course thumbnail image file
 *     responses:
 *       201:
 *         description: Course created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 course:
 *                   type: object
 *       400:
 *         description: Invalid data or missing required fields
 *       500:
 *         description: Failed to create course
 */

/**
 * @swagger
 * /api/course/courses/get-all-courses-by-instructorid:
 *   get:
 *     summary: Get all courses belonging to an instructor
 *     tags: [Courses]
 *     parameters:
 *       - in: query
 *         name: instructorId
 *         required: true
 *         schema:
 *           type: string
 *         description: Instructor ID
 *     responses:
 *       200:
 *         description: Courses retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 courses:
 *                   type: array
 *                   items:
 *                     type: object
 *       400:
 *         description: Missing instructor ID
 *       500:
 *         description: Failed to fetch courses
 */

/**
 * @swagger
 * /api/course/courses/delete/{id}:
 *   delete:
 *     summary: Delete a course
 *     tags: [Courses]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Course ID to delete
 *     responses:
 *       200:
 *         description: Course deleted successfully
 *       404:
 *         description: Course not found
 *       500:
 *         description: Failed to delete course
 */

/**
 * @swagger
 * /api/course/courses/{courseId}/public:
 *   get:
 *     summary: Get public course details
 *     tags: [Courses]
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *         description: Course ID
 *     responses:
 *       200:
 *         description: Course details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 course:
 *                   type: object
 *       404:
 *         description: Course not found
 *       500:
 *         description: Failed to fetch course
 */

/**
 * @swagger
 * /api/course/courses/{courseId}/publish:
 *   put:
 *     summary: Publish a course
 *     tags: [Courses]
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *         description: Course ID to publish
 *     responses:
 *       200:
 *         description: Course published successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 course:
 *                   type: object
 *       404:
 *         description: Course not found
 *       500:
 *         description: Failed to publish course
 */

/**
 * @swagger
 * /api/course/courses/revenue/summary:
 *   get:
 *     summary: Get revenue summary for instructor
 *     tags: [Courses]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Revenue summary retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 summary:
 *                   type: object
 *                   properties:
 *                     totalRevenue:
 *                       type: number
 *                     totalOrders:
 *                       type: number
 *                     totalStudents:
 *                       type: number
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to fetch revenue summary
 */

/**
 * @swagger
 * /api/course/courses/revenue/by-course:
 *   get:
 *     summary: Get revenue breakdown by course
 *     tags: [Courses]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Revenue by course retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 revenueByCourse:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       courseId:
 *                         type: string
 *                       courseName:
 *                         type: string
 *                       revenue:
 *                         type: number
 *                       orders:
 *                         type: number
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to fetch revenue by course
 */

/**
 * @swagger
 * /api/course/courses/revenue/orders:
 *   get:
 *     summary: Get revenue orders for instructor
 *     tags: [Courses]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Revenue orders retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 orders:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to fetch revenue orders
 */

/**
 * @swagger
 * /api/course/allcourses:
 *   get:
 *     summary: Get all courses
 *     tags: [Courses]
 *     responses:
 *       200:
 *         description: All courses retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 courses:
 *                   type: array
 *                   items:
 *                     type: object
 *       500:
 *         description: Failed to fetch courses
 */

/**
 * @swagger
 * /api/curriculum/courses/{courseId}/getcurriculum:
 *   get:
 *     summary: Get course curriculum
 *     tags: [Curriculum]
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *         description: Course ID
 *     responses:
 *       200:
 *         description: Curriculum retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 curriculum:
 *                   type: object
 *       404:
 *         description: Curriculum not found
 *       500:
 *         description: Failed to fetch curriculum
 */

/**
 * @swagger
 * /api/curriculum/courses/{courseId}/upsertcurriculum:
 *   put:
 *     summary: Create or update course curriculum sections
 *     tags: [Curriculum]
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *         description: Course ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sections:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     title:
 *                       type: string
 *                     lectures:
 *                       type: array
 *                       items:
 *                         type: object
 *     responses:
 *       200:
 *         description: Curriculum updated successfully
 *       400:
 *         description: Invalid curriculum data
 *       404:
 *         description: Course not found
 *       500:
 *         description: Failed to update curriculum
 */

/**
 * @swagger
 * /api/curriculum/courses/{courseId}/lectures/presign:
 *   post:
 *     summary: Get presigned URL for lecture video upload
 *     tags: [Curriculum]
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *         description: Course ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fileName
 *               - fileType
 *             properties:
 *               fileName:
 *                 type: string
 *                 description: Name of the video file
 *               fileType:
 *                 type: string
 *                 description: MIME type of the video file
 *     responses:
 *       200:
 *         description: Presigned URL generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 uploadUrl:
 *                   type: string
 *                 key:
 *                   type: string
 *       400:
 *         description: Missing required fields
 *       500:
 *         description: Failed to generate presigned URL
 */

/**
 * @swagger
 * /api/curriculum/courses/{courseId}/lectures/preview:
 *   get:
 *     summary: Get lecture preview URL
 *     tags: [Curriculum]
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *         description: Course ID
 *       - in: query
 *         name: lectureId
 *         required: true
 *         schema:
 *           type: string
 *         description: Lecture ID
 *     responses:
 *       200:
 *         description: Preview URL retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 previewUrl:
 *                   type: string
 *       400:
 *         description: Missing required parameters
 *       404:
 *         description: Lecture not found
 *       500:
 *         description: Failed to get preview URL
 */

/**
 * @swagger
 * /api/emailsettings/get-settings:
 *   get:
 *     summary: Get email settings for a service provider
 *     tags: [Email Settings]
 *     parameters:
 *       - in: query
 *         name: providerId
 *         required: true
 *         schema:
 *           type: string
 *         description: Service provider ID
 *     responses:
 *       200:
 *         description: Email settings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 settings:
 *                   type: object
 *       400:
 *         description: Missing provider ID
 *       404:
 *         description: Settings not found
 *       500:
 *         description: Failed to fetch settings
 */

/**
 * @swagger
 * /api/emailsettings/update-settings:
 *   post:
 *     summary: Update email settings for a service provider
 *     tags: [Email Settings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - providerId
 *             properties:
 *               providerId:
 *                 type: string
 *                 description: Service provider ID
 *               settings:
 *                 type: object
 *                 description: Email settings object
 *     responses:
 *       200:
 *         description: Settings updated successfully
 *       400:
 *         description: Missing required fields
 *       500:
 *         description: Failed to update settings
 */

/**
 * @swagger
 * /api/esign/init:
 *   post:
 *     summary: Initialize e-signature session
 *     tags: [E-Signature]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - documentId
 *             properties:
 *               userId:
 *                 type: string
 *                 description: User ID requesting e-signature
 *               documentId:
 *                 type: string
 *                 description: Document ID to be signed
 *               callbackUrl:
 *                 type: string
 *                 description: URL to redirect after signing
 *     responses:
 *       200:
 *         description: E-sign session initialized successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 sessionId:
 *                   type: string
 *                 redirectUrl:
 *                   type: string
 *       400:
 *         description: Missing required fields
 *       500:
 *         description: Failed to initialize e-sign session
 */

/**
 * @swagger
 * /api/esign/status:
 *   get:
 *     summary: Check e-signature status
 *     tags: [E-Signature]
 *     parameters:
 *       - in: query
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: E-sign session ID
 *     responses:
 *       200:
 *         description: Status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 status:
 *                   type: string
 *                   enum: [pending, completed, failed, expired]
 *                 signedAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Missing session ID
 *       404:
 *         description: Session not found
 *       500:
 *         description: Failed to check status
 */

/**
 * @swagger
 * /api/esign/getsigneddoc:
 *   get:
 *     summary: Get signed document
 *     tags: [E-Signature]
 *     parameters:
 *       - in: query
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: E-sign session ID
 *     responses:
 *       200:
 *         description: Signed document retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 documentUrl:
 *                   type: string
 *                 signedAt:
 *                   type: string
 *       400:
 *         description: Missing session ID
 *       404:
 *         description: Signed document not found
 *       500:
 *         description: Failed to retrieve signed document
 */

/**
 * @swagger
 * /api/esign/callback:
 *   get:
 *     summary: Handle e-signature callback from provider
 *     tags: [E-Signature]
 *     parameters:
 *       - in: query
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: E-sign session ID
 *       - in: query
 *         name: status
 *         required: true
 *         schema:
 *           type: string
 *         description: Signing status
 *     responses:
 *       200:
 *         description: Callback processed successfully
 *       400:
 *         description: Invalid callback parameters
 *       500:
 *         description: Failed to process callback
 */

/**
 * @swagger
 * /api/esign/session:
 *   get:
 *     summary: Get e-signature session details
 *     tags: [E-Signature]
 *     parameters:
 *       - in: query
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: E-sign session ID
 *     responses:
 *       200:
 *         description: Session details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 session:
 *                   type: object
 *       400:
 *         description: Missing session ID
 *       404:
 *         description: Session not found
 *       500:
 *         description: Failed to fetch session details
 */

/**
 * @swagger
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: Health check
 *     description: Returns server health status
 *     responses:
 *       200:
 *         description: Server is running
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Everything is Fine Here
 */

/**
 * @swagger
 * /api/data/serviceproviders:
 *   get:
 *     summary: Get all service providers
 *     tags: [Home Data]
 *     responses:
 *       200:
 *         description: List of service providers retrieved successfully
 */

/**
 * @swagger
 * /api/data/allarticles:
 *   get:
 *     summary: Get all articles
 *     tags: [Home Data]
 *     responses:
 *       200:
 *         description: List of articles retrieved successfully
 */

/**
 * @swagger
 * /api/data/allevents:
 *   get:
 *     summary: Get all events
 *     tags: [Home Data]
 *     responses:
 *       200:
 *         description: List of events retrieved successfully
 */

/**
 * @swagger
 * /api/data/allvideos:
 *   get:
 *     summary: Get all videos
 *     tags: [Home Data]
 *     responses:
 *       200:
 *         description: List of videos retrieved successfully
 */

/**
 * @swagger
 * /api/data/subprofiles:
 *   get:
 *     summary: Get sub-profiles
 *     tags: [Home Data]
 *     responses:
 *       200:
 *         description: Sub-profiles retrieved successfully
 */

/**
 * @swagger
 * /api/data/spbycategory:
 *   get:
 *     summary: Get service providers by category
 *     tags: [Home Data]
 *     responses:
 *       200:
 *         description: Service providers filtered by category retrieved successfully
 */

/**
 * @swagger
 * /api/data/spdetails:
 *   get:
 *     summary: Get full service provider details
 *     tags: [Home Data]
 *     responses:
 *       200:
 *         description: Full service provider details retrieved successfully
 */

/**
 * @swagger
 * /api/data/spstats:
 *   get:
 *     summary: Get service provider statistics
 *     tags: [Home Data]
 *     responses:
 *       200:
 *         description: Service provider statistics retrieved successfully
 */

/**
 * @swagger
 * /api/data/articledetail:
 *   get:
 *     summary: Get full article details
 *     tags: [Home Data]
 *     responses:
 *       200:
 *         description: Full article details retrieved successfully
 */

/**
 * @swagger
 * /api/data/eventdetails:
 *   get:
 *     summary: Get full event details
 *     tags: [Home Data]
 *     responses:
 *       200:
 *         description: Full event details retrieved successfully
 */

/**
 * @swagger
 * /api/data/articlesbyauthor:
 *   get:
 *     summary: Get articles by author
 *     tags: [Home Data]
 *     responses:
 *       200:
 *         description: Articles filtered by author retrieved successfully
 */

/**
 * @swagger
 * /api/data/checkspverified:
 *   get:
 *     summary: Check if a service provider is verified
 *     tags: [Home Data]
 *     responses:
 *       200:
 *         description: Service provider verification status retrieved successfully
 */

/**
 * @swagger
 * /api/data/allpmsservices:
 *   get:
 *     summary: Get all PMS services
 *     tags: [Home Data]
 *     responses:
 *       200:
 *         description: List of all PMS services retrieved successfully
 */

/**
 * @swagger
 * /api/data/viewpmsservicedetails:
 *   get:
 *     summary: View PMS service details
 *     tags: [Home Data]
 *     responses:
 *       200:
 *         description: PMS service details retrieved successfully
 */

/**
 * @swagger
 * /api/data/viewpackagedetails:
 *   get:
 *     summary: View package details
 *     tags: [Home Data]
 *     responses:
 *       200:
 *         description: Package details retrieved successfully
 */

/**
 * @swagger
 * /api/data/allnotifications:
 *   get:
 *     summary: Get all notifications
 *     tags: [Home Data]
 *     responses:
 *       200:
 *         description: List of all notifications retrieved successfully
 */

/**
 * @swagger
 * /api/data/allnotificationslength:
 *   get:
 *     summary: Get count of all notifications
 *     tags: [Home Data]
 *     responses:
 *       200:
 *         description: Notification count retrieved successfully
 */

/**
 * @swagger
 * /api/data/readnotifications/all:
 *   post:
 *     summary: Mark all notifications as read
 *     tags: [Home Data]
 *     responses:
 *       200:
 *         description: All notifications marked as read successfully
 */

/**
 * @swagger
 * /api/learn/courses/{courseId}/learn:
 *   get:
 *     summary: Get course for learning (enrolled students)
 *     tags: [Learn]
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *         description: Course ID
 *     responses:
 *       200:
 *         description: Course data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 course:
 *                   type: object
 *       404:
 *         description: Course not found
 *       500:
 *         description: Failed to fetch course
 */

/**
 * @swagger
 * /api/learn/courses/{courseId}/progress:
 *   get:
 *     summary: Get course progress for logged-in user
 *     tags: [Learn]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *         description: Course ID
 *     responses:
 *       200:
 *         description: Course progress retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 progress:
 *                   type: object
 *                   properties:
 *                     completed:
 *                       type: number
 *                     total:
 *                       type: number
 *                     percentage:
 *                       type: number
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Course or progress not found
 *       500:
 *         description: Failed to fetch progress
 */

/**
 * @swagger
 * /api/learn/lectures/{lectureId}/stream:
 *   get:
 *     summary: Stream lecture video
 *     tags: [Learn]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: lectureId
 *         required: true
 *         schema:
 *           type: string
 *         description: Lecture ID
 *     responses:
 *       200:
 *         description: Lecture stream URL retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 streamUrl:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: User not enrolled in course
 *       404:
 *         description: Lecture not found
 *       500:
 *         description: Failed to get stream URL
 */

/**
 * @swagger
 * /api/learn/lectures/{lectureId}/progress:
 *   post:
 *     summary: Save lecture progress for logged-in user
 *     tags: [Learn]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: lectureId
 *         required: true
 *         schema:
 *           type: string
 *         description: Lecture ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               progress:
 *                 type: number
 *                 description: Progress percentage (0-100)
 *               completed:
 *                 type: boolean
 *                 description: Whether lecture is completed
 *     responses:
 *       200:
 *         description: Progress saved successfully
 *       400:
 *         description: Invalid progress data
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to save progress
 */

/**
 * @swagger
 * /api/marketplace:
 *   post:
 *     summary: Create a new marketplace
 *     tags: [Marketplace]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Marketplace created successfully
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/market-watch/articles:
 *   get:
 *     summary: Get market watch articles
 *     tags: [Market Watch]
 *     responses:
 *       200:
 *         description: Successfully retrieved market watch articles
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/market-watch/videos:
 *   get:
 *     summary: Get market watch videos
 *     tags: [Market Watch]
 *     responses:
 *       200:
 *         description: Successfully retrieved market watch videos
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/market-watch/services:
 *   get:
 *     summary: Get market watch services
 *     tags: [Market Watch]
 *     responses:
 *       200:
 *         description: Successfully retrieved market watch services
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/market-watch/events:
 *   get:
 *     summary: Get market watch events
 *     tags: [Market Watch]
 *     responses:
 *       200:
 *         description: Successfully retrieved market watch events
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/market-watch/portfolios:
 *   get:
 *     summary: Get market portfolios
 *     tags: [Market Watch]
 *     responses:
 *       200:
 *         description: Successfully retrieved market portfolios
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/market-watch/spProvider:
 *   get:
 *     summary: Get all service providers
 *     tags: [Market Watch]
 *     responses:
 *       200:
 *         description: Successfully retrieved all service providers
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/messages/search:
 *   get:
 *     summary: Search members for messaging
 *     description: Retrieves the list of followed members (users or service providers) that can be messaged, based on the caller's ID and role.
 *     tags:
 *       - Messaging
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the current user or service provider
 *       - in: query
 *         name: role
 *         required: true
 *         schema:
 *           type: string
 *           enum: [user, provider]
 *         description: The role of the caller (user or provider)
 *     responses:
 *       200:
 *         description: Successfully fetched followed members
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Fetched
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       role:
 *                         type: string
 *                       category:
 *                         type: string
 *                       profileUrl:
 *                         type: string
 *       400:
 *         description: Missing id or role parameter
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: No id or role provided
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: failed to fetch members
 *                 error:
 *                   type: object
 */

/**
 * @swagger
 * /api/messages/getprofile:
 *   get:
 *     summary: Get user or service provider profile
 *     description: Retrieves the profile details (RegName, profileUrl, category) of a user or service provider by their ID.
 *     tags:
 *       - Messaging
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user or service provider whose profile is to be fetched
 *     responses:
 *       200:
 *         description: Successfully fetched profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: service fetched
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     RegName:
 *                       type: string
 *                     profileUrl:
 *                       type: string
 *                     category:
 *                       type: string
 *       400:
 *         description: Missing id parameter
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: No id provided
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: failed to fetch details
 *                 error:
 *                   type: object
 */

/**
 * @swagger
 * /api/package/package/create:
 *   post:
 *     summary: Create a new package
 *     tags: [Packages]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               bannerURL:
 *                 type: string
 *                 format: binary
 *                 description: Package banner image
 *               tncFile:
 *                 type: string
 *                 format: binary
 *                 description: Terms and conditions file
 *               data:
 *                 type: string
 *                 description: JSON stringified package data
 *     responses:
 *       201:
 *         description: Package created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 package:
 *                   type: object
 *       400:
 *         description: Invalid package data
 *       500:
 *         description: Failed to create package
 */

/**
 * @swagger
 * /api/package/package/update:
 *   put:
 *     summary: Update an existing package
 *     tags: [Packages]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               bannerURL:
 *                 type: string
 *                 format: binary
 *                 description: Updated package banner image
 *               tncFile:
 *                 type: string
 *                 format: binary
 *                 description: Updated terms and conditions file
 *               data:
 *                 type: string
 *                 description: JSON stringified package data including packageId
 *     responses:
 *       200:
 *         description: Package updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 package:
 *                   type: object
 *       400:
 *         description: Invalid package data or missing package ID
 *       404:
 *         description: Package not found
 *       500:
 *         description: Failed to update package
 */

/**
 * @swagger
 * /api/package/package/mypackages:
 *   get:
 *     summary: Get packages created by the current user
 *     tags: [Packages]
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: Packages retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 packages:
 *                   type: array
 *                   items:
 *                     type: object
 *       400:
 *         description: Missing user ID
 *       500:
 *         description: Failed to fetch packages
 */

/**
 * @swagger
 * /api/package/package/details:
 *   get:
 *     summary: Get package details
 *     tags: [Packages]
 *     parameters:
 *       - in: query
 *         name: packageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Package ID
 *     responses:
 *       200:
 *         description: Package details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 package:
 *                   type: object
 *       400:
 *         description: Missing package ID
 *       404:
 *         description: Package not found
 *       500:
 *         description: Failed to fetch package details
 */

/**
 * @swagger
 * /api/package/package/delete:
 *   delete:
 *     summary: Delete a package
 *     tags: [Packages]
 *     parameters:
 *       - in: query
 *         name: packageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Package ID to delete
 *     responses:
 *       200:
 *         description: Package deleted successfully
 *       400:
 *         description: Missing package ID
 *       404:
 *         description: Package not found
 *       500:
 *         description: Failed to delete package
 */

/**
 * @swagger
 * /api/payment/checkout:
 *   post:
 *     summary: Create a Razorpay checkout order using service provider keys
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - spId
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Amount in paise
 *               spId:
 *                 type: string
 *                 description: Service provider ID
 *     responses:
 *       200:
 *         description: Checkout order created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 checkout:
 *                   type: object
 *                 razorpayKeyId:
 *                   type: string
 *       400:
 *         description: Missing required fields
 *       404:
 *         description: Razorpay keys not found for this service provider
 *       500:
 *         description: Failed to create checkout
 */

/**
 * @swagger
 * /api/payment/checkoutrzp:
 *   post:
 *     summary: Create a Razorpay checkout order using platform keys
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Amount in rupees (converted to paise internally)
 *               spId:
 *                 type: string
 *                 description: Service provider ID (optional)
 *               courseId:
 *                 type: string
 *                 description: Course ID (optional)
 *     responses:
 *       200:
 *         description: Checkout order created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 checkout:
 *                   type: object
 *                 razorpayKeyId:
 *                   type: string
 *       400:
 *         description: Amount is required or invalid
 *       500:
 *         description: Payment gateway not configured or failed to create order
 */

/**
 * @swagger
 * /api/payment/createandenroll:
 *   post:
 *     summary: Create an order and enroll user in a course after Razorpay payment
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderById
 *               - courseId
 *             properties:
 *               razorpayPaymentId:
 *                 type: string
 *                 description: Razorpay payment ID
 *               razorpayOrderId:
 *                 type: string
 *                 description: Razorpay order ID
 *               razorpaySignature:
 *                 type: string
 *                 description: Razorpay signature for verification
 *               courseId:
 *                 type: string
 *                 description: ID of the course to enroll in
 *               orderById:
 *                 type: string
 *                 description: Buyer user ID
 *               orderByName:
 *                 type: string
 *                 description: Buyer name
 *               orderByEmail:
 *                 type: string
 *                 description: Buyer email
 *               soldById:
 *                 type: string
 *                 description: Seller/provider ID
 *               soldByName:
 *                 type: string
 *                 description: Seller/provider name
 *               subtotal:
 *                 type: number
 *                 description: Subtotal amount
 *               gst:
 *                 type: number
 *                 description: GST amount
 *               total:
 *                 type: number
 *                 description: Total amount
 *               currency:
 *                 type: string
 *                 default: INR
 *                 description: Currency code
 *               status:
 *                 type: string
 *                 default: captured
 *                 description: Payment status
 *     responses:
 *       200:
 *         description: Order created and enrollment successful
 *       400:
 *         description: Missing buyerId or courseId
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/payment/enrollment/check:
 *   get:
 *     summary: Check if a user is enrolled in a course
 *     tags: [Payments]
 *     parameters:
 *       - in: query
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *         description: Course ID to check enrollment for
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to check enrollment for
 *     responses:
 *       200:
 *         description: Enrollment status returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 enrolled:
 *                   type: boolean
 *       400:
 *         description: Missing courseId or userId
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/payment/withdraw/serviceprovider:
 *   post:
 *     summary: Withdraw amount for a service provider
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - amount
 *               - email
 *               - spId
 *             properties:
 *               name:
 *                 type: string
 *                 description: Service provider name
 *               amount:
 *                 type: number
 *                 description: Amount to withdraw
 *               email:
 *                 type: string
 *                 description: Service provider email
 *               spId:
 *                 type: string
 *                 description: Service provider ID
 *     responses:
 *       200:
 *         description: Withdrawal request submitted successfully
 *       400:
 *         description: Missing required fields
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/payment/promo/PROMO1:
 *   post:
 *     summary: Claim PROMO1 promotional discount
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *                 description: User ID
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               type:
 *                 type: string
 *               title:
 *                 type: string
 *               disclaimer:
 *                 type: string
 *               validity:
 *                 type: string
 *               price:
 *                 type: number
 *               coupon:
 *                 type: string
 *               serviceType:
 *                 type: string
 *               authorImage:
 *                 type: string
 *               AUM:
 *                 type: string
 *               NoOfClients:
 *                 type: number
 *               inceptionDate:
 *                 type: string
 *               Fundmanager:
 *                 type: string
 *               returnsByTime:
 *                 type: object
 *               AsOn:
 *                 type: string
 *               isFreeTrial:
 *                 type: boolean
 *               freeTrailDays:
 *                 type: number
 *               duration:
 *                 type: string
 *               Documents:
 *                 type: object
 *               validTill:
 *                 type: string
 *               description:
 *                 type: string
 *               coupenCode:
 *                 type: string
 *     responses:
 *       200:
 *         description: Promo discount claimed successfully
 *       400:
 *         description: No data provided
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/payment/walletbalance:
 *   get:
 *     summary: Get wallet balance for a user
 *     tags: [Payments]
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: Wallet balance retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 walletBalance:
 *                   type: number
 *       500:
 *         description: Failed to fetch wallet balance
 */

/**
 * @swagger
 * /api/payment/transactions:
 *   get:
 *     summary: Get wallet transactions for a user
 *     tags: [Payments]
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: Transactions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 transactions:
 *                   type: array
 *                   items:
 *                     type: object
 *       500:
 *         description: Failed to fetch transactions
 */

/**
 * @swagger
 * /api/payment/leads:
 *   get:
 *     summary: Get leads for a service provider
 *     tags: [Payments]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         required: false
 *         schema:
 *           type: string
 *           enum: [service, portfolio]
 *         description: Filter leads by type (service or portfolio)
 *     responses:
 *       200:
 *         description: Leads retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 leads:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/payment/leads/update:
 *   patch:
 *     summary: Update a lead status
 *     tags: [Payments]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *             properties:
 *               serviceId:
 *                 type: string
 *                 description: Service ID associated with the lead
 *               status:
 *                 type: string
 *                 description: New status for the lead
 *               type:
 *                 type: string
 *                 description: Lead type (required)
 *     responses:
 *       200:
 *         description: Lead updated successfully
 *       400:
 *         description: Lead type is required
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/payment/add/paymentdetails:
 *   post:
 *     summary: Add payment details for a service provider (with QR code upload)
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - data
 *             properties:
 *               data:
 *                 type: string
 *                 description: JSON stringified payment details object
 *               qrCode:
 *                 type: string
 *                 format: binary
 *                 description: QR code image file
 *     responses:
 *       200:
 *         description: Payment details added successfully
 *       500:
 *         description: Failed to add payment details
 */

/**
 * @swagger
 * /api/payment/update/paymentdetails:
 *   post:
 *     summary: Update payment details for a service provider (with QR code upload)
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - data
 *             properties:
 *               data:
 *                 type: string
 *                 description: JSON stringified payment details object
 *               qrCode:
 *                 type: string
 *                 format: binary
 *                 description: QR code image file
 *     responses:
 *       200:
 *         description: Payment details updated successfully
 *       500:
 *         description: Failed to update payment details
 */

/**
 * @swagger
 * /api/payment/get/paymentdetails:
 *   get:
 *     summary: Get payment details for a service provider
 *     tags: [Payments]
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Service provider ID
 *     responses:
 *       200:
 *         description: Payment details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 paymentDetails:
 *                   type: object
 *       400:
 *         description: Missing service provider ID
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/payment/subscription-details:
 *   get:
 *     summary: Get subscription details for a user
 *     tags: [Payments]
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: Subscription details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 subscription:
 *                   type: object
 *       400:
 *         description: User ID is required
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/payment/createandverifyorder:
 *   post:
 *     summary: Create and verify a manual payment order (with payment proof upload)
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - data
 *             properties:
 *               data:
 *                 type: string
 *                 description: >
 *                   JSON stringified order data containing subscribedToId, serviceName,
 *                   orderByName, orderById, orderByEmail, soldByName, soldById,
 *                   subtotal, gst, total, validity, signedDocumentUrl, aadhaarUrl,
 *                   panUrl, paymentId, isRenewal, previousOrderId, coupon,
 *                   discountAmount, type, razorpayPaymentId, razorpayOrderId,
 *                   razorpaySignature, paymentMode
 *               paymentProof:
 *                 type: string
 *                 format: binary
 *                 description: Payment proof image/document file
 *     responses:
 *       200:
 *         description: Order created and verified successfully
 *       400:
 *         description: No data provided or invalid JSON
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/payment/verify-manual-payment:
 *   post:
 *     summary: Verify a manual payment order (service provider dashboard)
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *             properties:
 *               orderId:
 *                 type: string
 *                 description: ID of the order to verify
 *     responses:
 *       200:
 *         description: Manual payment verified successfully
 *       400:
 *         description: Order ID is required
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/payment/reject-manual-payment:
 *   post:
 *     summary: Reject a manual payment order (service provider dashboard)
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *             properties:
 *               orderId:
 *                 type: string
 *                 description: ID of the order to reject
 *               reason:
 *                 type: string
 *                 description: Reason for rejection
 *     responses:
 *       200:
 *         description: Manual payment rejected successfully
 *       400:
 *         description: Order ID is required
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/payment/user-order/{serviceId}:
 *   get:
 *     summary: Get a user's order for a specific service (for renewal UI)
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the service
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User order retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 order:
 *                   type: object
 *       400:
 *         description: Service ID and User ID are required
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/payment/get/razorpaykeys:
 *   get:
 *     summary: Get Razorpay keys for a service provider
 *     tags: [Payments]
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Service provider ID
 *     responses:
 *       200:
 *         description: Razorpay keys retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 razorpayKeys:
 *                   type: object
 *       500:
 *         description: Failed to fetch Razorpay keys
 */

/**
 * @swagger
 * /api/payment/get/getsppaymentdetails:
 *   get:
 *     summary: Get service provider payment details
 *     tags: [Payments]
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Service provider ID
 *     responses:
 *       200:
 *         description: Service provider payment details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 paymentDetails:
 *                   type: object
 *       400:
 *         description: Service provider ID is required
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/payment/add/razorpaykeys:
 *   post:
 *     summary: Add Razorpay keys for a service provider
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - keyId
 *               - keySecret
 *               - id
 *             properties:
 *               keyId:
 *                 type: string
 *                 description: Razorpay key ID
 *               keySecret:
 *                 type: string
 *                 description: Razorpay key secret
 *               webhookSecret:
 *                 type: string
 *                 description: Razorpay webhook secret
 *               id:
 *                 type: string
 *                 description: Service provider ID
 *               name:
 *                 type: string
 *                 description: Service provider name
 *               email:
 *                 type: string
 *                 description: Service provider email
 *     responses:
 *       200:
 *         description: Razorpay keys added successfully
 *       400:
 *         description: Missing data
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/payment/update/razorpaykeys:
 *   post:
 *     summary: Update Razorpay keys for a service provider
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               _id:
 *                 type: string
 *                 description: Document ID of the Razorpay key entry
 *               keyId:
 *                 type: string
 *                 description: Updated Razorpay key ID
 *               keySecret:
 *                 type: string
 *                 description: Updated Razorpay key secret
 *               webhookSecret:
 *                 type: string
 *                 description: Updated Razorpay webhook secret
 *     responses:
 *       200:
 *         description: Razorpay keys updated successfully
 *       500:
 *         description: Failed to update Razorpay keys
 */

/**
 * @swagger
 * /api/payment/RAtopUp:
 *   post:
 *     summary: Top up a service provider's wallet balance
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - spID
 *               - amount
 *               - transactionId
 *             properties:
 *               spID:
 *                 type: string
 *                 description: Service provider ID
 *               amount:
 *                 type: number
 *                 description: Amount to top up
 *               transactionId:
 *                 type: string
 *                 description: Transaction ID for the top-up
 *     responses:
 *       200:
 *         description: Wallet topped up successfully
 *       400:
 *         description: spID, amount, and transactionId are required
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/portfolio/get-portfolio-by-id:
 *   get:
 *     summary: Get a portfolio by its ID
 *     description: Retrieves a single portfolio by its unique identifier, including processed scripts with current market prices, performance metrics, closed positions, performance history, and service provider details.
 *     tags:
 *       - Portfolios
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique identifier (MongoDB ObjectId) of the portfolio
 *     responses:
 *       200:
 *         description: Portfolio retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Portfolio retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     portfolioName:
 *                       type: string
 *                     theme:
 *                       type: string
 *                     methodology:
 *                       type: string
 *                     rationale:
 *                       type: string
 *                     disclosure:
 *                       type: string
 *                     benchmarkIndex:
 *                       type: string
 *                     investmentHorizon:
 *                       type: number
 *                     reviewFrequency:
 *                       type: number
 *                     minInvestmentAmount:
 *                       type: number
 *                     fees:
 *                       type: number
 *                     feeValidity:
 *                       type: string
 *                     riskLevel:
 *                       type: number
 *                     tncFileURL:
 *                       type: string
 *                     bannerImageURL:
 *                       type: string
 *                     sername:
 *                       type: string
 *                     seraddress:
 *                       type: string
 *                     scripts:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           slNo:
 *                             type: number
 *                           exchangeType:
 *                             type: string
 *                           segmentType:
 *                             type: string
 *                           scriptName:
 *                             type: object
 *                             properties:
 *                               exchange:
 *                                 type: string
 *                               token:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                           cmp:
 *                             type: number
 *                           buyRate:
 *                             type: number
 *                           quantity:
 *                             type: number
 *                           weightage:
 *                             type: number
 *                           value:
 *                             type: number
 *                           currentCMP:
 *                             type: number
 *                             nullable: true
 *                           initialValue:
 *                             type: number
 *                           currentValue:
 *                             type: number
 *                           profitLoss:
 *                             type: number
 *                           profitLossPercentage:
 *                             type: number
 *                     performance:
 *                       type: object
 *                       properties:
 *                         totalInitialValue:
 *                           type: number
 *                         totalCurrentValue:
 *                           type: number
 *                         totalProfitLoss:
 *                           type: number
 *                         totalProfitLossPercentage:
 *                           type: number
 *                     performanceHistoryLast12Months:
 *                       type: array
 *                       items:
 *                         type: object
 *                     dailyHistory:
 *                       type: array
 *                       items:
 *                         type: object
 *                     serviceProviderData:
 *                       type: object
 *                       properties:
 *                         profileImage:
 *                           type: string
 *                         number:
 *                           type: string
 *                         address1:
 *                           type: string
 *                         address2:
 *                           type: string
 *                         city:
 *                           type: string
 *                         state:
 *                           type: string
 *                         description:
 *                           type: string
 *                         regNumber:
 *                           type: string
 *                         disclaimer:
 *                           type: string
 *       400:
 *         description: Portfolio id is required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Portfolio id is required
 *       404:
 *         description: Portfolio or ServiceProvider not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Portfolio not found
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Internal server error
 *                 error:
 *                   type: string
 */

/**
 * @swagger
 * /api/portfolio/get-all-portfolios:
 *   get:
 *     summary: Get all portfolios with pagination, sorting, and search
 *     description: Retrieves a paginated list of all portfolios. Supports sorting by any field, search filtering across portfolio name, theme, and methodology.
 *     tags:
 *       - Portfolios
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           minimum: 1
 *           maximum: 100
 *         description: Number of items per page (1-100)
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *         description: Field name to sort by (e.g., createdAt, portfolioName, theme)
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order - ascending or descending
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term to filter portfolios by name, theme, or methodology (case-insensitive)
 *     responses:
 *       200:
 *         description: Portfolios retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Portfolios retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     portfolios:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           portfolioName:
 *                             type: string
 *                           theme:
 *                             type: string
 *                           methodology:
 *                             type: string
 *                           rationale:
 *                             type: string
 *                           disclosure:
 *                             type: string
 *                           benchmarkIndex:
 *                             type: string
 *                           investmentHorizon:
 *                             type: number
 *                           reviewFrequency:
 *                             type: number
 *                           minInvestmentAmount:
 *                             type: number
 *                           fees:
 *                             type: number
 *                           feeValidity:
 *                             type: string
 *                           riskLevel:
 *                             type: number
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         currentPage:
 *                           type: integer
 *                           example: 1
 *                         totalPages:
 *                           type: integer
 *                           example: 5
 *                         totalItems:
 *                           type: integer
 *                           example: 50
 *                         itemsPerPage:
 *                           type: integer
 *                           example: 10
 *                         hasNextPage:
 *                           type: boolean
 *                           example: true
 *                         hasPrevPage:
 *                           type: boolean
 *                           example: false
 *       400:
 *         description: Invalid page number or limit
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Invalid page number
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Internal server error
 *                 error:
 *                   type: string
 */

/**
 * @swagger
 * /api/portfolio/get-portfolios:
 *   get:
 *     summary: Get all portfolios by author ID
 *     description: Retrieves all portfolios created by a specific author, including processed scripts with current market prices and performance calculations.
 *     tags:
 *       - Portfolios
 *     parameters:
 *       - in: query
 *         name: authorId
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique identifier of the author (service provider)
 *     responses:
 *       200:
 *         description: Portfolios retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Portfolios retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       portfolioName:
 *                         type: string
 *                       theme:
 *                         type: string
 *                       methodology:
 *                         type: string
 *                       minInvestmentAmount:
 *                         type: number
 *                       scripts:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             slNo:
 *                               type: number
 *                             exchangeType:
 *                               type: string
 *                             segmentType:
 *                               type: string
 *                             scriptName:
 *                               type: object
 *                               properties:
 *                                 exchange:
 *                                   type: string
 *                                 token:
 *                                   type: string
 *                                 name:
 *                                   type: string
 *                             cmp:
 *                               type: number
 *                             buyRate:
 *                               type: number
 *                             quantity:
 *                               type: number
 *                             weightage:
 *                               type: number
 *                             value:
 *                               type: number
 *                             currentCMP:
 *                               type: number
 *                               nullable: true
 *                             initialValue:
 *                               type: number
 *                             currentValue:
 *                               type: number
 *                             profitLoss:
 *                               type: number
 *                             profitLossPercentage:
 *                               type: number
 *                       closedPositions:
 *                         type: array
 *                         items:
 *                           type: object
 *                       performance:
 *                         type: object
 *                         properties:
 *                           totalInitialValue:
 *                             type: number
 *                           totalCurrentValue:
 *                             type: number
 *                           totalProfitLoss:
 *                             type: number
 *                           totalProfitLossPercentage:
 *                             type: number
 *                       performanceHistoryLast12Months:
 *                         type: array
 *                         items:
 *                           type: object
 *       400:
 *         description: Author ID is required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Author ID is required
 *       404:
 *         description: No portfolios found for this author
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: No portfolios found for this author
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Internal server error
 *                 error:
 *                   type: string
 */

/**
 * @swagger
 * /api/portfolio/create-portfolio:
 *   post:
 *     summary: Create a new portfolio
 *     description: Creates a new portfolio with author data, assets, risk metrics, fees, and file uploads (TnC document and optional banner image). Uses multipart/form-data with a JSON `data` field for portfolio details and file fields for uploads.
 *     tags:
 *       - Portfolios
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - data
 *               - tncFile
 *             properties:
 *               data:
 *                 type: string
 *                 description: >
 *                   JSON stringified portfolio data containing authorData, portfolioName,
 *                   theme, methodology, rationale, disclosure, benchmarkIndex,
 *                   investmentHorizon, reviewFrequency, minInvestmentAmount, assets,
 *                   feeValidity, fees, riskLevel, and optional riskMetrics and shareWithMarketplaces.
 *                 example: >
 *                   {"authorData":{"id":"abc123","name":"John Doe","email":"john@example.com"},
 *                   "portfolioName":"Growth Portfolio","theme":"Technology",
 *                   "methodology":"Momentum-based stock selection methodology",
 *                   "rationale":"Investing in high-growth technology companies",
 *                   "disclosure":"Past performance is not indicative of future results",
 *                   "benchmarkIndex":"NIFTY50","investmentHorizon":12,"reviewFrequency":3,
 *                   "minInvestmentAmount":100000,
 *                   "assets":[{"slNo":1,"exchangeType":"NSE","segmentType":"EQ",
 *                   "scriptName":{"exchange":"NSE","token":"1234","name":"RELIANCE"},
 *                   "cmp":2500,"qty":10,"weightage":25,"value":25000}],
 *                   "feeValidity":"12 months","fees":5000,"riskLevel":3,
 *                   "riskMetrics":{"standardDeviation":"12%","sharpeRatio":"1.5","maximumDrawdown":"8%"},
 *                   "shareWithMarketplaces":["marketplace1"]}
 *               tncFile:
 *                 type: string
 *                 format: binary
 *                 description: Terms and Conditions file (required, uploaded to S3)
 *               bannerImage:
 *                 type: string
 *                 format: binary
 *                 description: Banner image for the portfolio (optional, uploaded to S3)
 *     responses:
 *       201:
 *         description: Portfolio created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Portfolio created successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     authorData:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         email:
 *                           type: string
 *                     portfolioName:
 *                       type: string
 *                     theme:
 *                       type: string
 *                     methodology:
 *                       type: string
 *                     rationale:
 *                       type: string
 *                     disclosure:
 *                       type: string
 *                     benchmarkIndex:
 *                       type: string
 *                     investmentHorizon:
 *                       type: number
 *                     reviewFrequency:
 *                       type: number
 *                     minInvestmentAmount:
 *                       type: number
 *                     fees:
 *                       type: number
 *                     feeValidity:
 *                       type: string
 *                     riskLevel:
 *                       type: number
 *                     tncFileURL:
 *                       type: string
 *                     bannerURL:
 *                       type: string
 *                     scripts:
 *                       type: array
 *                       items:
 *                         type: object
 *                     shareWithMarketplaces:
 *                       type: array
 *                       items:
 *                         type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Validation error or TnC file missing or duplicate portfolio name
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Validation error
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Internal server error
 *                 error:
 *                   type: string
 */

/**
 * @swagger
 * /api/portfolio/update-portfolio:
 *   post:
 *     summary: Update an existing portfolio
 *     description: >
 *       Updates a portfolio identified by its ID (passed as a query parameter).
 *       Only the fields provided in the request body will be updated.
 *       Automatically detects rebalance events when scripts or closed positions change,
 *       increments the rebalance counter, and logs an update event.
 *     tags:
 *       - Portfolios
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique identifier (MongoDB ObjectId) of the portfolio to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: >
 *               Any combination of the allowed fields. Only provided fields will be updated.
 *             properties:
 *               portfolioName:
 *                 type: string
 *                 description: Name of the portfolio
 *               theme:
 *                 type: string
 *                 description: Theme of the portfolio
 *               methodology:
 *                 type: string
 *                 description: Investment methodology
 *               benchmarkIndex:
 *                 type: string
 *                 description: Benchmark index for the portfolio
 *               investmentHorizon:
 *                 type: number
 *                 description: Investment horizon in months
 *               reviewFrequency:
 *                 type: number
 *                 description: Review frequency in months
 *               minInvestmentAmount:
 *                 type: number
 *                 description: Minimum investment amount
 *               launchDate:
 *                 type: string
 *                 format: date-time
 *                 description: Launch date of the portfolio
 *               rationale:
 *                 type: string
 *                 description: Rationale for the portfolio
 *               disclosure:
 *                 type: string
 *                 description: Disclosure text
 *               scripts:
 *                 type: array
 *                 description: Array of scripts/assets in the portfolio (scripts with quantity 0 are filtered out)
 *                 items:
 *                   type: object
 *                   properties:
 *                     slNo:
 *                       type: number
 *                     exchangeType:
 *                       type: string
 *                     segmentType:
 *                       type: string
 *                     scriptName:
 *                       type: object
 *                       properties:
 *                         exchange:
 *                           type: string
 *                         token:
 *                           type: string
 *                         name:
 *                           type: string
 *                     cmp:
 *                       type: number
 *                     quantity:
 *                       type: number
 *                     weightage:
 *                       type: number
 *                     value:
 *                       type: number
 *               closedPositions:
 *                 type: array
 *                 description: Array of closed positions
 *                 items:
 *                   type: object
 *                   properties:
 *                     closedAt:
 *                       type: string
 *                       format: date-time
 *                     investedValue:
 *                       type: number
 *                     value:
 *                       type: number
 *               riskMetrics:
 *                 type: object
 *                 description: Risk metrics for the portfolio
 *                 properties:
 *                   standardDeviation:
 *                     type: string
 *                   sharpeRatio:
 *                     type: string
 *                   maximumDrawdown:
 *                     type: string
 *               shareWithMarketplaces:
 *                 type: array
 *                 description: List of marketplace IDs to share with
 *                 items:
 *                   type: string
 *               fees:
 *                 type: number
 *                 description: Fee amount
 *               feeValidity:
 *                 type: string
 *                 description: "Fee validity period (e.g., '12 months', '2 years')"
 *               riskLevel:
 *                 type: number
 *                 description: Risk level percentage
 *     responses:
 *       200:
 *         description: Portfolio updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Portfolio updated successfully
 *                 data:
 *                   type: object
 *                   description: The updated portfolio document
 *       400:
 *         description: Portfolio id is required or no valid fields to update
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Portfolio id is required
 *       404:
 *         description: Portfolio not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Portfolio not found
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Internal server error
 *                 error:
 *                   type: string
 */

/**
 * @swagger
 * /api/portfolio/delete-portfolio/{id}:
 *   delete:
 *     summary: Delete a portfolio by ID
 *     description: Permanently deletes a portfolio identified by the path parameter ID.
 *     tags:
 *       - Portfolios
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique identifier (MongoDB ObjectId) of the portfolio to delete
 *     responses:
 *       200:
 *         description: Portfolio deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Portfolio deleted successfully
 *                 data:
 *                   type: object
 *                   description: The deleted portfolio document
 *       400:
 *         description: Portfolio id is required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Portfolio id is required
 *       404:
 *         description: Portfolio not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Portfolio not found
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Internal server error
 *                 error:
 *                   type: string
 */

/**
 * @swagger
 * /api/post/postarticle:
 *   post:
 *     summary: Post a new article
 *     tags:
 *       - Content Management
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Article cover image
 *               articlePDF:
 *                 type: string
 *                 format: binary
 *                 description: Article PDF file
 *     responses:
 *       200:
 *         description: Article posted successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/post/postvideo:
 *   post:
 *     summary: Post a new video
 *     tags:
 *       - Content Management
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Video thumbnail image
 *     responses:
 *       200:
 *         description: Video posted successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/post/postpodcast:
 *   post:
 *     summary: Post a new podcast
 *     tags:
 *       - Content Management
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Podcast cover image
 *     responses:
 *       200:
 *         description: Podcast posted successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/post/postevent:
 *   post:
 *     summary: Post a new event
 *     tags:
 *       - Content Management
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Event image
 *     responses:
 *       200:
 *         description: Event posted successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/post/addnewcoupon:
 *   post:
 *     summary: Add a new coupon
 *     tags:
 *       - Content Management
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Coupon added successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/post/updatecoupon:
 *   put:
 *     summary: Update an existing coupon
 *     tags:
 *       - Content Management
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Coupon updated successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/post/createservice:
 *   post:
 *     summary: Create a new service
 *     tags:
 *       - Content Management
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               bannerURL:
 *                 type: string
 *                 format: binary
 *                 description: Service banner image
 *               tncFile:
 *                 type: string
 *                 format: binary
 *                 description: Terms and conditions PDF file
 *     responses:
 *       200:
 *         description: Service created successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/post/deactivateservice:
 *   post:
 *     summary: Deactivate a service
 *     tags:
 *       - Content Management
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Service deactivated successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/post/activateservice:
 *   post:
 *     summary: Activate a service
 *     tags:
 *       - Content Management
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Service activated successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/post/deleteservice:
 *   delete:
 *     summary: Delete a service
 *     tags:
 *       - Content Management
 *     responses:
 *       200:
 *         description: Service deleted successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/post/updateservice:
 *   put:
 *     summary: Update an existing service
 *     tags:
 *       - Content Management
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               bannerURL:
 *                 type: string
 *                 format: binary
 *                 description: Updated service banner image
 *               tncFile:
 *                 type: string
 *                 format: binary
 *                 description: Updated terms and conditions PDF file
 *     responses:
 *       200:
 *         description: Service updated successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/post/fetchService:
 *   get:
 *     summary: Fetch a single service
 *     tags:
 *       - Content Management
 *     responses:
 *       200:
 *         description: Service fetched successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/post/allarticles:
 *   get:
 *     summary: Get all articles
 *     tags:
 *       - Content Management
 *     responses:
 *       200:
 *         description: List of all articles
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/post/allarticles/previous:
 *   get:
 *     summary: Get all previous articles
 *     tags:
 *       - Content Management
 *     responses:
 *       200:
 *         description: List of all previous articles
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/post/allarticles/scheduled:
 *   get:
 *     summary: Get all scheduled articles
 *     tags:
 *       - Content Management
 *     responses:
 *       200:
 *         description: List of all scheduled articles
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/post/deleteArticles:
 *   delete:
 *     summary: Delete an article
 *     tags:
 *       - Content Management
 *     responses:
 *       200:
 *         description: Article deleted successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/post/allvideos:
 *   get:
 *     summary: Get all videos
 *     tags:
 *       - Content Management
 *     responses:
 *       200:
 *         description: List of all videos
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/post/allvideos/previous:
 *   get:
 *     summary: Get all previous videos
 *     tags:
 *       - Content Management
 *     responses:
 *       200:
 *         description: List of all previous videos
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/post/allvideos/scheduled:
 *   get:
 *     summary: Get all scheduled videos
 *     tags:
 *       - Content Management
 *     responses:
 *       200:
 *         description: List of all scheduled videos
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/post/allpodcasts:
 *   get:
 *     summary: Get all podcasts
 *     tags:
 *       - Content Management
 *     responses:
 *       200:
 *         description: List of all podcasts
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/post/allpodcasts/previous:
 *   get:
 *     summary: Get all previous podcasts
 *     tags:
 *       - Content Management
 *     responses:
 *       200:
 *         description: List of all previous podcasts
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/post/allpodcasts/scheduled:
 *   get:
 *     summary: Get all scheduled podcasts
 *     tags:
 *       - Content Management
 *     responses:
 *       200:
 *         description: List of all scheduled podcasts
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/post/allevents:
 *   get:
 *     summary: Get all events
 *     tags:
 *       - Content Management
 *     responses:
 *       200:
 *         description: List of all events
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/post/allapprovedevents:
 *   get:
 *     summary: Get all approved events
 *     tags:
 *       - Content Management
 *     responses:
 *       200:
 *         description: List of all approved events
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/post/allpaidevents:
 *   get:
 *     summary: Get all paid events
 *     tags:
 *       - Content Management
 *     responses:
 *       200:
 *         description: List of all paid events
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/post/allservices:
 *   get:
 *     summary: Get all services
 *     tags:
 *       - Content Management
 *     responses:
 *       200:
 *         description: List of all services
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/post/allservicesforcoupon:
 *   get:
 *     summary: Get all services available for coupon assignment
 *     tags:
 *       - Content Management
 *     responses:
 *       200:
 *         description: List of all services available for coupons
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/post/allcoupons:
 *   get:
 *     summary: Get all coupons
 *     tags:
 *       - Content Management
 *     responses:
 *       200:
 *         description: List of all coupons
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/post/updatecoupon:
 *   put:
 *     summary: Update an existing coupon (alternate route)
 *     tags:
 *       - Content Management
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Coupon updated successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/post/deletecoupons:
 *   delete:
 *     summary: Delete a coupon
 *     tags:
 *       - Content Management
 *     responses:
 *       200:
 *         description: Coupon deleted successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/post/getcoupon:
 *   get:
 *     summary: Get a coupon by ID
 *     tags:
 *       - Content Management
 *     responses:
 *       200:
 *         description: Coupon details fetched successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/post/disclaimer:
 *   get:
 *     summary: Get the disclaimer
 *     tags:
 *       - Content Management
 *     responses:
 *       200:
 *         description: Disclaimer fetched successfully
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/protean/templates:
 *   post:
 *     summary: Get Protean templates
 *     description: Retrieves available Protean templates.
 *     tags:
 *       - Protean
 *     responses:
 *       200:
 *         description: Protean templates retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       500:
 *         description: Internal server error.
 */

/**
 * @swagger
 * /api/scorecard/getmyrecommendations:
 *   get:
 *     summary: Fetch my recommendations
 *     description: Retrieves all recommendations created by a specific provider, optionally filtered by plan.
 *     tags:
 *       - Score Cards
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The provider ID
 *       - in: query
 *         name: planId
 *         required: false
 *         schema:
 *           type: string
 *         description: Filter by plan ID (use "all" or omit for all plans)
 *     responses:
 *       200:
 *         description: Recommendations fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                 plans:
 *                   type: array
 *                   items:
 *                     type: object
 *       400:
 *         description: Provider ID is required
 *       500:
 *         description: Failed to fetch recommendations
 */

/**
 * @swagger
 * /api/scorecard/getsharedwithplans:
 *   get:
 *     summary: Get shared-with plans
 *     description: Retrieves the list of plans a scorecard has been shared with.
 *     tags:
 *       - Score Cards
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The scorecard ID
 *     responses:
 *       200:
 *         description: Plans fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       title:
 *                         type: string
 *       500:
 *         description: No id provided or failed to fetch
 */

/**
 * @swagger
 * /api/scorecard/closedtrades/all:
 *   get:
 *     summary: Get all closed trades
 *     description: Retrieves the latest 50 closed trades across all providers.
 *     tags:
 *       - Score Cards
 *     responses:
 *       200:
 *         description: Closed trades fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       500:
 *         description: Failed to fetch closed trades
 */

/**
 * @swagger
 * /api/scorecard/closedtrades/plan:
 *   get:
 *     summary: Get closed trades shared with a plan
 *     description: Retrieves the latest 50 closed trades that were shared with a specific plan.
 *     tags:
 *       - Score Cards
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The plan ID to filter closed trades by
 *     responses:
 *       200:
 *         description: Closed trades fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       400:
 *         description: Plan ID is required
 *       500:
 *         description: Failed to fetch closed trades
 */

/**
 * @swagger
 * /api/scorecard/scorecards/latest:
 *   get:
 *     summary: Get latest scorecards
 *     description: Retrieves the 3 most recently created scorecards.
 *     tags:
 *       - Score Cards
 *     responses:
 *       200:
 *         description: Latest scorecards fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       500:
 *         description: Failed to fetch scorecards
 */

/**
 * @swagger
 * /api/scorecard/getcmp:
 *   post:
 *     summary: Get current market price
 *     description: Fetches the current market price (CMP/LTP) for a given token and exchange. Uses Redis cache first, falls back to MarketPriceFetcher on cache miss.
 *     tags:
 *       - Score Cards
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - exchange
 *             properties:
 *               token:
 *                 type: string
 *                 description: The instrument token
 *               exchange:
 *                 type: string
 *                 description: The exchange name (e.g. NSE, BSE)
 *     responses:
 *       200:
 *         description: CMP fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: number
 *                   description: The last traded price
 *       400:
 *         description: No token provided
 *       500:
 *         description: Failed to fetch CMP
 */

/**
 * @swagger
 * /api/scriptmaster/symbols:
 *   get:
 *     summary: Get list of trading symbols
 *     tags: [Script Master]
 *     parameters:
 *       - in: query
 *         name: exchange
 *         required: false
 *         schema:
 *           type: string
 *         description: Filter by exchange (NSE, BSE, MCX)
 *     responses:
 *       200:
 *         description: Symbols retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 symbols:
 *                   type: array
 *                   items:
 *                     type: string
 *       500:
 *         description: Failed to fetch symbols
 */

/**
 * @swagger
 * /api/scriptmaster/expiries:
 *   get:
 *     summary: Get expiry dates for derivatives
 *     tags: [Script Master]
 *     parameters:
 *       - in: query
 *         name: symbol
 *         required: true
 *         schema:
 *           type: string
 *         description: Trading symbol
 *       - in: query
 *         name: exchange
 *         required: false
 *         schema:
 *           type: string
 *         description: Exchange name
 *     responses:
 *       200:
 *         description: Expiry dates retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 expiries:
 *                   type: array
 *                   items:
 *                     type: string
 *       400:
 *         description: Missing symbol parameter
 *       500:
 *         description: Failed to fetch expiries
 */

/**
 * @swagger
 * /api/scriptmaster/strikes:
 *   get:
 *     summary: Get strike prices for options
 *     tags: [Script Master]
 *     parameters:
 *       - in: query
 *         name: symbol
 *         required: true
 *         schema:
 *           type: string
 *         description: Trading symbol
 *       - in: query
 *         name: expiry
 *         required: true
 *         schema:
 *           type: string
 *         description: Expiry date
 *       - in: query
 *         name: exchange
 *         required: false
 *         schema:
 *           type: string
 *         description: Exchange name
 *     responses:
 *       200:
 *         description: Strike prices retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 strikes:
 *                   type: array
 *                   items:
 *                     type: number
 *       400:
 *         description: Missing required parameters
 *       500:
 *         description: Failed to fetch strikes
 */

/**
 * @swagger
 * /api/scriptmaster/token:
 *   get:
 *     summary: Get instrument token for a trading symbol
 *     tags: [Script Master]
 *     parameters:
 *       - in: query
 *         name: symbol
 *         required: true
 *         schema:
 *           type: string
 *         description: Trading symbol
 *       - in: query
 *         name: exchange
 *         required: true
 *         schema:
 *           type: string
 *         description: Exchange name (NSE, BSE, MCX)
 *       - in: query
 *         name: expiry
 *         required: false
 *         schema:
 *           type: string
 *         description: Expiry date for derivatives
 *       - in: query
 *         name: strike
 *         required: false
 *         schema:
 *           type: number
 *         description: Strike price for options
 *       - in: query
 *         name: optionType
 *         required: false
 *         schema:
 *           type: string
 *           enum: [CE, PE]
 *         description: Option type (Call/Put)
 *     responses:
 *       200:
 *         description: Token retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 token:
 *                   type: string
 *                 instrumentId:
 *                   type: string
 *       400:
 *         description: Missing required parameters
 *       404:
 *         description: Token not found for given parameters
 *       500:
 *         description: Failed to fetch token
 */

/**
 * @swagger
 * /api/scriptmaster/sync:
 *   post:
 *     summary: Trigger script master data synchronization
 *     tags: [Script Master]
 *     responses:
 *       200:
 *         description: Synchronization triggered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       500:
 *         description: Failed to trigger synchronization
 */

/**
 * @swagger
 * /api/services/subscribedservices:
 *   get:
 *     summary: Get subscribed services
 *     tags: [Services]
 *     responses:
 *       200:
 *         description: Successfully retrieved subscribed services
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/services/subscribedcourses:
 *   get:
 *     summary: Get subscribed courses
 *     tags: [Services]
 *     responses:
 *       200:
 *         description: Successfully retrieved subscribed courses
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/services/allservices:
 *   get:
 *     summary: Get all service provider services
 *     tags: [Services]
 *     responses:
 *       200:
 *         description: Successfully retrieved all SP services
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/services/allservices/sharewith:
 *   get:
 *     summary: Get all share-with service provider services
 *     tags: [Services]
 *     responses:
 *       200:
 *         description: Successfully retrieved all share-with SP services
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/services/getdocuments:
 *   get:
 *     summary: Get all documents
 *     tags: [Services]
 *     responses:
 *       200:
 *         description: Successfully retrieved all documents
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/services/checksubscribedservice:
 *   get:
 *     summary: Check if a service is subscribed
 *     tags: [Services]
 *     responses:
 *       200:
 *         description: Successfully checked subscribed service status
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/services/check-subscription:
 *   get:
 *     summary: Get service provider subscription
 *     tags: [Services]
 *     responses:
 *       200:
 *         description: Successfully retrieved SP subscription
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/services/getbyprovider/{id}:
 *   get:
 *     summary: Get services by provider ID
 *     tags: [Services]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The service provider ID
 *     responses:
 *       200:
 *         description: Successfully retrieved services for the provider
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/services/applyCoupon:
 *   post:
 *     summary: Apply a coupon code
 *     tags: [Services]
 *     responses:
 *       200:
 *         description: Coupon applied successfully
 *       400:
 *         description: Invalid coupon
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/services/applycouponforevent:
 *   post:
 *     summary: Apply a coupon on an event
 *     tags: [Services]
 *     responses:
 *       200:
 *         description: Coupon applied on event successfully
 *       400:
 *         description: Invalid coupon
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/services/claimfreetrial:
 *   post:
 *     summary: Claim a free trial
 *     tags: [Services]
 *     responses:
 *       200:
 *         description: Free trial claimed successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/telegram/telegram-webhook:
 *   post:
 *     summary: Receive Telegram webhook updates
 *     description: Receives Telegram chat_join_request updates. The request is verified using the X-Telegram-Bot-Api-Secret-Token header via the verifyTelegramWebhook middleware.
 *     tags:
 *       - Telegram
 *     parameters:
 *       - in: header
 *         name: X-Telegram-Bot-Api-Secret-Token
 *         required: true
 *         schema:
 *           type: string
 *         description: Secret token used to verify the request originates from Telegram.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               chat_join_request:
 *                 type: object
 *                 properties:
 *                   chat:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         description: The chat ID.
 *                   from:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         description: The user ID.
 *                       username:
 *                         type: string
 *                       first_name:
 *                         type: string
 *                       last_name:
 *                         type: string
 *                   invite_link:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                         description: The invite link name (contains the order ID).
 *     responses:
 *       200:
 *         description: Update processed successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *       400:
 *         description: Bad request - missing required fields.
 *       403:
 *         description: Unauthorized - invalid secret token.
 *       500:
 *         description: Internal server error.
 */

/**
 * @swagger
 * /api/telegram/set-webhook:
 *   post:
 *     summary: Set Telegram webhook URL
 *     description: Configures the Telegram bot webhook URL to receive chat_join_request updates.
 *     tags:
 *       - Telegram
 *     responses:
 *       200:
 *         description: Webhook set successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         description: TELEGRAM_BOT token not found.
 *       500:
 *         description: Failed to set webhook.
 */

/**
 * @swagger
 * /api/telegram/webhook-info:
 *   get:
 *     summary: Get Telegram webhook info
 *     description: Retrieves the current webhook configuration info from the Telegram Bot API.
 *     tags:
 *       - Telegram
 *     responses:
 *       200:
 *         description: Webhook info retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         description: TELEGRAM_BOT token not found.
 *       500:
 *         description: Failed to get webhook info.
 */

/**
 * @swagger
 * /api/telegram/webhook:
 *   delete:
 *     summary: Delete Telegram webhook
 *     description: Deletes the current Telegram bot webhook and drops any pending updates.
 *     tags:
 *       - Telegram
 *     responses:
 *       200:
 *         description: Webhook deleted successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         description: TELEGRAM_BOT token not found.
 *       500:
 *         description: Failed to delete webhook.
 */

/**
 * @swagger
 * /api/telegram/debug-env:
 *   get:
 *     summary: Get bot token debug info
 *     description: Returns debug information about the Telegram bot token environment variable (presence, length, prefix).
 *     tags:
 *       - Telegram
 *     responses:
 *       200:
 *         description: Debug info returned successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 hasBotToken:
 *                   type: boolean
 *                   description: Whether the bot token is set.
 *                 tokenLength:
 *                   type: integer
 *                   description: Length of the bot token.
 *                 tokenPrefix:
 *                   type: string
 *                   description: First 10 characters of the bot token.
 *                 webhookUrl:
 *                   type: string
 *                   description: The configured webhook URL.
 */

/**
 * @swagger
 * /api/test/remove-user:
 *   post:
 *     summary: Remove user from Telegram channel (test endpoint)
 *     tags: [Test]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - serviceId
 *               - userId
 *             properties:
 *               serviceId:
 *                 type: string
 *                 description: Service/channel ID
 *               userId:
 *                 type: string
 *                 description: User ID to remove
 *               user_id:
 *                 type: string
 *                 description: Alternative user ID parameter
 *     responses:
 *       200:
 *         description: User removal triggered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: serviceId and userId are required
 *       500:
 *         description: Failed to remove user
 */

/**
 * @swagger
 * /api/updateprofile/serviceprovider:
 *   post:
 *     summary: Update service provider profile details
 *     tags: [Profile Updates]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               newPfp:
 *                 type: string
 *                 format: binary
 *                 description: New profile picture
 *               investorCharter:
 *                 type: string
 *                 format: binary
 *                 description: Investor charter document
 *               signature:
 *                 type: string
 *                 format: binary
 *                 description: Signature image
 *     responses:
 *       200:
 *         description: Service provider profile updated successfully
 */

/**
 * @swagger
 * /api/updateprofile/serviceprovider/document:
 *   post:
 *     summary: Upload a service provider document
 *     tags: [Profile Updates]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               document:
 *                 type: string
 *                 format: binary
 *                 description: Document file to upload
 *     responses:
 *       200:
 *         description: Service provider document uploaded successfully
 */

/**
 * @swagger
 * /api/updateprofile/user:
 *   post:
 *     summary: Update user profile details
 *     tags: [Profile Updates]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               newPfp:
 *                 type: string
 *                 format: binary
 *                 description: New profile picture
 *     responses:
 *       200:
 *         description: User profile updated successfully
 */

/**
 * @swagger
 * /api/updateprofile/broker:
 *   post:
 *     summary: Update broker profile details
 *     tags: [Profile Updates]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               newPfp:
 *                 type: string
 *                 format: binary
 *                 description: New profile picture
 *               companyLogo:
 *                 type: string
 *                 format: binary
 *                 description: Company logo image
 *               certificate:
 *                 type: string
 *                 format: binary
 *                 description: Certificate document
 *               CompanyCertificate:
 *                 type: string
 *                 format: binary
 *                 description: Company certificate document
 *               investorCharter:
 *                 type: string
 *                 format: binary
 *                 description: Investor charter document
 *               signature:
 *                 type: string
 *                 format: binary
 *                 description: Signature image
 *     responses:
 *       200:
 *         description: Broker profile updated successfully
 */

/**
 * @swagger
 * /api/user/userdetails:
 *   get:
 *     summary: Get user details by ID
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The user ID
 *     responses:
 *       200:
 *         description: User fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: User Fetched
 *                 data:
 *                   type: object
 *       500:
 *         description: Failed to fetch user or ID not provided
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 */

/**
 * @swagger
 * /api/user/follow:
 *   post:
 *     summary: Follow a user or service provider
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - targetId
 *               - initiatingId
 *               - role
 *               - targetName
 *             properties:
 *               targetId:
 *                 type: string
 *                 description: ID of the user to follow
 *               initiatingId:
 *                 type: string
 *                 description: ID of the user initiating the follow
 *               role:
 *                 type: string
 *                 enum: [user, provider]
 *                 description: Role of the initiating user
 *               targetName:
 *                 type: string
 *                 description: Name of the target user
 *     responses:
 *       200:
 *         description: User followed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: User Followed
 *       500:
 *         description: Failed to follow user or not enough details provided
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 */

/**
 * @swagger
 * /api/user/unfollow:
 *   post:
 *     summary: Unfollow a user or service provider
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - targetId
 *               - initiatingId
 *               - role
 *             properties:
 *               targetId:
 *                 type: string
 *                 description: ID of the user to unfollow
 *               initiatingId:
 *                 type: string
 *                 description: ID of the user initiating the unfollow
 *               role:
 *                 type: string
 *                 enum: [user, provider]
 *                 description: Role of the initiating user
 *     responses:
 *       200:
 *         description: User unfollowed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: User un Followed
 *       500:
 *         description: Failed to unfollow user or no ID provided
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 */

/**
 * @swagger
 * /api/user/getfollowing/list:
 *   get:
 *     summary: Get the list of user IDs the user is following
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The user or provider ID
 *       - in: query
 *         name: role
 *         required: true
 *         schema:
 *           type: string
 *           enum: [user, provider]
 *         description: Role of the user
 *     responses:
 *       200:
 *         description: Following list fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: List fetched
 *                 data:
 *                   type: array
 *                   items:
 *                     type: string
 *       500:
 *         description: Failed to fetch following list or no data provided
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 */

/**
 * @swagger
 * /api/user/getfollowing/details:
 *   get:
 *     summary: Get detailed info of service providers the user is following
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The user or provider ID
 *       - in: query
 *         name: role
 *         required: true
 *         schema:
 *           type: string
 *           enum: [user, provider]
 *         description: Role of the user
 *     responses:
 *       200:
 *         description: Following details fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: List fetched
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       type:
 *                         type: string
 *                       category:
 *                         type: string
 *                       RegName:
 *                         type: string
 *                       regNumber:
 *                         type: string
 *                       profileUrl:
 *                         type: string
 *                       companyLogo:
 *                         type: string
 *                       stats:
 *                         type: object
 *                         properties:
 *                           Followers:
 *                             type: array
 *                             items:
 *                               type: string
 *       500:
 *         description: Failed to fetch following details or no data provided
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 */

/**
 * @swagger
 * /api/user/getfollowers:
 *   get:
 *     summary: Get followers of a service provider
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The service provider ID
 *     responses:
 *       200:
 *         description: Followers list fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: List fetched
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       role:
 *                         type: string
 *                       profileUrl:
 *                         type: string
 *       500:
 *         description: Failed to fetch followers or no ID provided
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 */

/**
 * @swagger
 * /api/user/getallsubscribers:
 *   get:
 *     summary: Get all subscribers (active and inactive) of a service provider
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The service provider ID
 *     responses:
 *       200:
 *         description: Subscribers fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Subscribers fetched successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       email:
 *                         type: string
 *                       number:
 *                         type: string
 *                       role:
 *                         type: string
 *                       profileUrl:
 *                         type: string
 *                       plan:
 *                         type: string
 *                       purchaseDate:
 *                         type: string
 *                       validity:
 *                         type: string
 *                       serviceName:
 *                         type: string
 *                       signedDocumentUrl:
 *                         type: string
 *                       paymentProof:
 *                         type: string
 *                       kycDetails:
 *                         type: object
 *                       isExpired:
 *                         type: boolean
 *       400:
 *         description: No ID provided
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *       500:
 *         description: Failed to fetch subscribers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 */

/**
 * @swagger
 * /api/user/getactivesubscribers:
 *   get:
 *     summary: Get active subscribers of a service provider
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The service provider ID
 *     responses:
 *       200:
 *         description: Active subscribers fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Active subscribers fetched successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       email:
 *                         type: string
 *                       number:
 *                         type: string
 *                       role:
 *                         type: string
 *                       profileUrl:
 *                         type: string
 *                       plan:
 *                         type: string
 *                       purchaseDate:
 *                         type: string
 *                         format: date-time
 *                       validity:
 *                         type: string
 *                       serviceName:
 *                         type: string
 *       400:
 *         description: No ID provided
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *       500:
 *         description: Failed to fetch active subscribers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 */

/**
 * @swagger
 * /api/user/getinactivesubscribers:
 *   get:
 *     summary: Get inactive subscribers of a service provider
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The service provider ID
 *     responses:
 *       200:
 *         description: Inactive subscribers fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Inactive subscribers fetched successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       email:
 *                         type: string
 *                       number:
 *                         type: string
 *                       role:
 *                         type: string
 *                       profileUrl:
 *                         type: string
 *                       plan:
 *                         type: string
 *                       purchaseDate:
 *                         type: string
 *                         format: date-time
 *                       validity:
 *                         type: string
 *                       serviceName:
 *                         type: string
 *       400:
 *         description: No ID provided
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *       500:
 *         description: Failed to fetch inactive subscribers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 */

/**
 * @swagger
 * /api/user/getleads/normal:
 *   get:
 *     summary: Get normal leads for a service provider
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The service provider ID
 *     responses:
 *       200:
 *         description: Leads fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: fetched leads
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       email:
 *                         type: string
 *                       name:
 *                         type: string
 *                       serviceName:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                       validity:
 *                         type: string
 *       500:
 *         description: Failed to get leads data or no ID provided
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 */

/**
 * @swagger
 * /api/user/spcontactdetails:
 *   get:
 *     summary: Get service provider contact details
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The service provider ID
 *     responses:
 *       200:
 *         description: SP contact details fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: SP contact details fetched
 *                 data:
 *                   type: object
 *                   properties:
 *                     RegName:
 *                       type: string
 *                     email:
 *                       type: string
 *                     profileUrl:
 *                       type: string
 *                     number:
 *                       type: string
 *                     address1:
 *                       type: string
 *                     address2:
 *                       type: string
 *       500:
 *         description: Failed to fetch SP contact details or no ID provided
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 */

/**
 * @swagger
 * /api/user/registerforevent:
 *   post:
 *     summary: Register a user for an event
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *               - name
 *               - email
 *               - number
 *               - eventId
 *             properties:
 *               id:
 *                 type: string
 *                 description: The user ID
 *               name:
 *                 type: string
 *                 description: The user name
 *               email:
 *                 type: string
 *                 description: The user email
 *               number:
 *                 type: string
 *                 description: The user phone number
 *               eventId:
 *                 type: string
 *                 description: The event ID to register for
 *               eventMode:
 *                 type: string
 *                 enum: [online, offline]
 *                 description: Mode of event attendance (required for hybrid events)
 *     responses:
 *       200:
 *         description: Registration successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Registration successful
 *                 eventMode:
 *                   type: string
 *                   example: online
 *       400:
 *         description: User already registered or event mode required for hybrid events
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       404:
 *         description: Event not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */

/**
 * @swagger
 * /api/whatsapp/connect:
 *   post:
 *     summary: Connect to WhatsApp
 *     description: Initiates a WhatsApp connection.
 *     tags:
 *       - WhatsApp
 *     responses:
 *       200:
 *         description: WhatsApp connection initiated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       500:
 *         description: Internal server error.
 */
export {};
