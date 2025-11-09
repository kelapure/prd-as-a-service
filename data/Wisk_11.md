# Product Requirements Document

## Business Problem

Wisk currently faces significant inefficiencies and limitations in its material request and procurement process. The existing Jira-based system struggles to handle complex requests involving multiple components, resulting in manual interventions and fragmented data flows. The lack of systematic integration between demand, inventory, and procurement data hinders proactive decision-making and supply chain optimization.

Engineers requesting parts cannot determine whether items are available in inventory or need to be ordered, as the ERP system does not provide feedback during the request process. Similarly, the Supply Chain Manager lacks easy access to structured material request information, complicating decision-making and slowing the procurement workflow. These limitations create bottlenecks in the engineering and manufacturing processes, delaying product development and increasing operational costs.

8090's software solution will replace the existing Jira-based request process with a centralized, systematic platform for material requests. The solution will enable seamless handling of complex material requests, improve data integration across procurement and inventory systems, and lay the groundwork for future Material Requirements Planning functionality. This transformation will accelerate the procurement process, reduce manual effort, and provide greater visibility into material availability and procurement status.

## Current Process

The existing material request process uses Jira to create and manage "Part Requests." Users log in and select the "Material Requests (REQ)" project to complete required fields, such as summary, department account, part specifications, and delivery details, and attach relevant documents. Once submitted, the request is assigned to supply chain personnel for review and processing, which entails checking inventory and issuing a purchase order. Refer to [<u&gt;Appendix B - Process Diagrams</u&gt;](https://docs.google.com/document/d/1gMeSt3l1GfB7gIsyGr9G5n7pwR65WBY31M8IeyCaqjs/edit?tab=t.0#heading=h.85dal626rhjw) for more information related to the current process.

For multiple part requests, the current process becomes particularly cumbersome. Requesters first tabulate information in a spreadsheet, then either paste the data into the Jira Issue or attach the spreadsheet as a document. This information is neither stored in a structured database nor easily searchable. Parts are manually tracked using spreadsheets, creating significant inefficiencies and opportunities for error.

From a systems integration standpoint, the current process suffers from significant fragmentation. Orders are manually entered into Coupa for purchasing, and inventory updates are separately entered into SAP Business One (B1). Engineers requesting parts have no visibility into inventory levels during the request process, preventing them from determining whether a part is available or needs to be ordered. The Supply Chain Manager also lacks easy access to this information, complicating decision-making and slowing the procurement workflow.

Jira currently handles workflow and notifications for material requests, but key attributes of requested materials and parts are not systematically stored in a structured database. This lack of structured data storage limits reporting capabilities and prevents analysis of procurement patterns and trends. The system cannot easily generate reports on procurement trends, inventory utilization, or supplier performance, limiting strategic decision-making capabilities.

Part names are created in TeamCenter, then pushed into SAP B1, and finally into a manual spreadsheet. This multi-step process introduces opportunities for inconsistencies and errors, particularly when new parts are added or existing parts are modified. The manual nature of these processes creates additional workload for the procurement team and increases the risk of data discrepancies between systems.

## Product Definition

The Material Request System maintains structured records of all part requests, integrates with inventory and purchasing systems. This integrated approach eliminates the current fragmentation between systems, creating a single source of truth for material request activities.

At its core, the system implements a structured database that captures all attributes for material requests and their associated parts. This database stores information including requester details, part specifications, accounting codes, delivery requirements, and approval history. The system maintains relationships between requests, line items, approvals, and external system references, creating a complete record of all procurement activities.

The user interface provides role-appropriate views and capabilities for different stakeholders in the procurement process. Requesters access an intuitive form that guides them through the request creation process, with validation ensuring that all required information is provided. Approvers receive notifications of pending requests and can review complete request details before making approval decisions. Procurement specialists gain visibility into approved requests, current inventory levels, and purchasing options, enabling informed decisions about fulfillment methods.

The system maintains limited integration with Jira specifically for inventory fulfillment tasks. When line items are routed to inventory fulfillment, the system creates Jira issues assigned to the Warehouse Supervisor for inventory management and tracking. The system implements webhook integration to receive status updates from Jira, enabling real-time propagation of inventory fulfillment progress back to the Material Request System. All other workflow management, status tracking, and task assignments are handled directly within the Material Request System's database, eliminating the need for broader Jira integration while preserving the connection to inventory operations. The system implements read-only integration with SAP B1 to display current inventory levels, enabling users to see part availability before submitting requests. Read-only integration with TeamCenter ensures procurement activities use consistent part numbers and specifications across engineering and manufacturing functions. For purchasing needs, the system implements write capabilities to Coupa, automatically generating purchase orders for approved requests without requiring manual data re-entry.

This solution transforms Wisk's material request process from a fragmented, manual workflow to an integrated, data-driven system. By providing visibility into inventory, streamlining approval processes, and connecting procurement activities with other business systems, the Material Request System reduces cycle times, improves decision-making, and creates a foundation for future supply chain optimization.

### Future State Process Flow

The Material Request System implements a streamlined workflow that guides material requests from creation through fulfillment:

1. **Request Creation and Validation**
   * Engineers create a material request in the system with all request details and line items
   * System validates all required and conditional fields before submission
   * System creates a structured material request record in the database
2. **Internal Notification and Review**
   * System sends internal notifications to the appropriate Approver (Procurement Manager)
   * All workflow management and status tracking occurs within the Material Request System
3. **Review and Routing Decision**
   * Approver reviews the request within the Material Request System interface
   * Approver examines request details with inventory data from SAP B1 and part data from TeamCenter
   * Based on available information, Approver determines the appropriate fulfillment method:
     * Route to Inventory if parts are available in stock
     * Route to Purchasing if parts need to be ordered
     * Route to Other (Machining/Manufacturing) for specialized production
   * For items routed to Purchasing, Approver also determines whether Program Manager review is required
   * Approver can selectively reject individual line items when appropriate or edit/add line items when appropriate. The original requester can also edit/add line items before the routing decision has been submitted.
4. **Fulfillment Path Processing**
   * For Inventory fulfillment:
     * System creates inventory issue in Jira with WebLink reference to the material request and assigns to Warehouse Supervisor
     * Warehouse Supervisor reviews, transfers inventory, assigns Jira issue to team member for action
     * Team member closes Jira issue once all items are delivered
     * System receives status updates from Jira for inventory fulfillment tracking
   * For Purchasing fulfillment:
     * All purchasing workflow management occurs within the Material Request System
     * If Program Manager review is required:
       * System routes the purchase request to the appropriate Program Manager based on the department field
       * Program Manager reviews and approves or rejects the purchase request within the system
       * If rejected, the request may be returned for more information or remain rejected
     * Once approved (either directly or after Program Manager review), Approver assigns the request to the selected Buyer within the system
     * Buyer reviews quotes/specifications outside of the system and may view historical procurement information for the same part from other material requests
     * Buyer assigns supplier(s) to each line item routed to purchasing. Only suppliers who are registered in Coupa can have $1000 or more committed to them for one material request.
     * Buyer pushes supplier information to Coupa and creates Draft Requisitions. One requisition is created per supplier for all the line items in the material request that were routed to purchasing. Requisitions are only generated for suppliers who have $1000 or more committed to them as part of this requisition.
     * Purchase order is processed through Coupa.
     * Buyer updates purchase status within the Material Request System once purchase order is placed.
   * For Machining/Manufacturing fulfillment:
     * The process takes place outside of the system.
5. **Status Updates and Completion**
   * System manages all internal status transitions within the Material Request System database
   * For inventory items, system receives status updates from Jira integration
   * Request transitions from Pending Approval to Approved after routing decision is submitted and from Approved to Closed after the original requester receives their parts and marks the request as completed.

This workflow ensures clear visibility into request status throughout the process while maintaining appropriate system boundaries between the Material Request System, Jira, SAP B1, TeamCenter, and Coupa.

## Product Features

The Material Request System implements a suite of features addressing the key challenges in Wisk's current procurement process. The system begins with a systematic and structured material request database that serves as the foundation for all procurement activities. This database supports a customizable and flexible set of fields and attributes as detailed in [<u&gt;8.1 Parts Request Attributes</u&gt;](https://docs.google.com/document/d/1gMeSt3l1GfB7gIsyGr9G5n7pwR65WBY31M8IeyCaqjs/edit?tab=t.0#heading=h.plu3s5a9yh49), ensuring that all necessary information (including attachments) is captured for effective procurement management. The system supports multi-line material entry with routing for individual line items to different fulfillment methods, accommodating complex procurement scenarios where some items come from inventory while others require purchasing. This structured approach aligns requested materials and parts in a consistent database, creating a single source of truth for procurement information. The system ensures data quality through comprehensive validation rules that verify field values, logical relationships, and system compatibility before submission.

The system supports selective rejection of line items during the approval process, allowing approvers to reject specific items while approving others within the same request. Rather than rejecting line items, Approvers/Buyers can add/edit line items as a means of suggesting substitute parts when appropriate. The original requester may also add/edit lie items, but only before the routing decision is submitted.

Integration with inventory and procurement systems forms a crucial aspect of the solution, providing real-time visibility into material availability and procurement status. The system connects with SAP B1 through read-only integration to show current inventory levels, enabling procurement managers to make informed decisions about fulfillment methods. The system retrieves part information from TeamCenter through read-only integration, ensuring consistency between engineering and procurement activities. These read-only integrations prevent unauthorized modifications to inventory and engineering data while making this information accessible within the procurement workflow. For purchasing needs, the system implements write capabilities to Coupa, automatically generating requisitions with all necessary details. These integrations eliminate the current manual processes for synchronizing information between systems, reducing administrative burden while improving data accuracy and timeliness.

The system maintains limited integration with Jira specifically for inventory fulfillment operations. When line items are routed to inventory fulfillment, the system creates Jira issues assigned to the Warehouse Supervisor with relevant inventory details and WebLinks that reference back to the original material request. As these inventory issues progress through completion, status updates flow back to the Material Request System for tracking purposes. All other workflow management, approval processes, and status tracking occur directly within the Material Request System's database, eliminating dependency on Jira for primary workflow operations while preserving the connection to warehouse inventory management.

The search and tracking capabilities enable users to find and monitor material requests throughout their lifecycle. The system provides flexible search functionality that allows users to locate requests by material part id, title, requester, request status, subtask status, assignee and other attributes, accommodating different search patterns and information needs. The tracking interface displays request status, subtask status and fulfillment information, providing visibility into the procurement process. Each request has a unique identifier that is included in the URL, enabling direct access to specific requests through bookmarks or links from other systems. This direct linking capability facilitates efficient referencing of requests across teams and systems, supporting seamless workflow integration. These capabilities eliminate the current challenges in locating specific requests and understanding their current state, improving responsiveness to engineering and manufacturing needs.

Status and workflow updates provide real-time information about procurement activities through the Material Request System's internal database. The system manages all approval workflows, purchasing status tracking, and completion notifications directly within its own interface. For inventory fulfillment, the system receives status updates from Jira integration to track warehouse operations. This approach provides complete visibility into procurement activities while maintaining operational independence from external workflow systems.

The system emphasizes ease of use through intuitive interfaces and streamlined processes. The multi-line entry interface supports copy/paste as well as file upload functionality from spreadsheets, accommodating efficient data transfer from existing sources. The attachment management capabilities allow users to add supporting documentation to requests, providing context and justification for procurement decisions. The interface simplifies tracking and managing requests through clear status indicators, notification integration, and contextual information, reducing the learning curve and improving user adoption.

The system provides role-specific interfaces for each key persona in the procurement workflow. Requesters can create and track their own requests, Procurement Managers (Approvers) can review and route requests, and Buyers can manage purchasing activities including assigning suppliers and generating purchase requisitions. This persona-based approach ensures that each user has access to the specific functionality needed to perform their responsibilities within the procurement workflow.

### Request Comments and Communication

The system provides a commenting capability that enables stakeholders to communicate directly within material requests throughout the procurement lifecycle. This feature addresses the need for contextual communication and documentation by allowing any authenticated user to add comments to material requests at any stage of the process.

The commenting interface displays within each request's detail view, showing all comments in reverse chronological order with the most recent comments appearing first. Each comment entry captures the commenter's email address, the full comment text, and a precise timestamp indicating when the comment was submitted. This chronological organization ensures that users can quickly see the latest developments and follow the conversation flow naturally.

The system stores all comments as permanent records associated with their respective material requests, creating an audit trail of communication and decision-making throughout the procurement process. Comments remain visible to all users who have access to view the material request, promoting transparency and enabling all stakeholders to stay informed about request status, concerns, or additional requirements. The commenting functionality operates independently of request status, allowing communication to continue even after requests are completed or closed.

Users access the commenting feature through a text input field positioned prominently within the request detail interface. Upon submitting a comment, the system immediately displays the new comment at the top of the comment list, providing instant feedback that the comment has been recorded. The interface automatically populates the commenter's email address from their authenticated session, ensuring accurate attribution without requiring manual entry.

The system maintains focused integration with Jira specifically for inventory management operations. Inventory fulfillment tasks continue to leverage Jira's capabilities for warehouse workflow management, with the Material Request System receiving status updates to maintain visibility into inventory operations. All other workflow management, notifications, and task assignments occur directly within the Material Request System, providing complete control over procurement processes while preserving the established inventory management workflows. This focused approach ensures that the system maintains operational independence while leveraging Jira's strengths in warehouse operations management.

## Measurement

### Success Criteria

Systematic capture and record-keeping of all Requested Materials and Parts in a new structured database system. Easy to use entry of Part Requests, Part Number-level reporting and integration with Jira and Coupa.

The metrics we measure and aim to improve, though not all within our control, is the **average request cycle-time** which is aggregated at the fulfillment method level.

## Technical Requirements

The Material Request System establishes a comprehensive technical foundation that connects Wisk's existing enterprise systems through carefully defined integration patterns. The system provides web-based access through standard browsers, ensuring that all stakeholders can participate in the procurement process regardless of their location or device.

The system integrates with Okta for Single Sign-On (SSO) authentication and role-based access control. This integration ensures that users are properly authenticated and have access only to the functionality appropriate for their role within the procurement process. Role information from Okta as stipulated by Wisk determines which interface components and data are accessible to each user, maintaining appropriate system boundaries and access controls.

The data management approach centers on a structured database that captures all material request attributes and relationships. This database stores comprehensive information about parts, including specifications, availability, procurement history, and current status. By maintaining these relationships in a structured format, the system enables the advanced search, reporting, and analysis capabilities that were impossible with the previous implementation.

The system implements limited integration with Jira specifically for inventory fulfillment operations. When line items are routed to inventory fulfillment, the system creates Jira issues with relevant inventory details and WebLinks that reference back to the original material request, then assigns them to the Warehouse Supervisor. As these inventory issues progress through completion, status updates flow back to the Material Request System for tracking purposes. All other workflow management, including approval processes, purchasing assignments, and status tracking, occurs directly within the Material Request System's database. This focused integration approach maintains operational independence while preserving the established inventory management workflows that warehouse teams rely on.

For inventory visibility, the system establishes read-only integration with SAP Business One. This connection retrieves current inventory levels for all parts, enabling users to see availability before submitting requests. The integration pulls information about existing parts including part names and descriptions as well as current stock levels. This visibility eliminates the current blind spots in the request process, where engineers cannot determine whether items are available or need to be ordered. The read-only nature of this integration maintains SAP B1 as the authoritative system of record for inventory, while making this information accessible within the procurement workflow.

The system includes read-only integration with TeamCenter to access approved part names, numbers and descriptions. This connection ensures that procurement activities use consistent part numbers and specifications across engineering and manufacturing functions. When users create requests, the system shows part numbers against TeamCenter records, showing possibly errors and inconsistencies in the process. This integration improves data accuracy across systems by making the information from Team Center readily available in the Material Request System.

For purchasing, the system implements an integration with Coupa to create purchase orders for approved requests. When procurement managers determine that items must be purchased, the system generates properly formatted purchase order requests in Coupa with all necessary attributes including part numbers, quantities, accounting codes, and delivery requirements. This integration eliminates the current manual re-entry of procurement data, reducing processing time and preventing transcription errors. The system tracks the relationship between material requests and resulting purchase orders, maintaining traceability throughout the procurement lifecycle.

The user interface accommodates both simple and complex procurement scenarios. For single-item requests, the system provides an intuitive form that guides users through the request process. For multi-line requests, the interface supports efficient data entry through copy/paste functionality from existing spreadsheets. This flexible approach accommodates different procurement scenarios while maintaining data consistency across all request types.

The system implements comprehensive validation to ensure data quality throughout the procurement process. These validation rules verify that all required fields contain appropriate values, preventing incomplete or invalid requests from entering the workflow. The validation extends beyond simple field formatting to include business rules that leverage information from integrated systems, such as validating part numbers against TeamCenter records and checking inventory availability against SAP B1 data.

Search capabilities enable users to locate requests by part number, description, requester, status, and other attributes. This searchability addresses a critical limitation in the current process, where locating specific requests often requires manual review of multiple sources. The tracking interface provides visibility into request status, approval progress, and fulfillment methods, creating transparency throughout the procurement lifecycle. The system maintains links to Jira tickets, Coupa purchase orders, and other related records, enabling users to navigate seamlessly between connected systems.

By connecting existing enterprise systems through appropriate integration patterns and providing structured data management, the Material Request System creates the foundation for efficient procurement operations and future supply chain optimization.

### Integration and Edge Cases

The Material Request System provides clear user feedback throughout integration processes, ensuring users understand system status and next steps. As the JIRA ticket progresses through approval workflows, status updates appear in real-time within the Material Request interface, eliminating the need for users to switch between applications to track progress.

For inventory visibility through SAP B1 integration, the system implements visual indicators that clearly communicate part availability. In-stock items display a green indicator with available quantity, limited stock shows an amber warning with remaining quantity, and out-of-stock items present a red indicator with estimated restock timeframes when available.

The TeamCenter integration provides immediate validation feedback during part selection. Valid part numbers receive a visual confirmation indicator, while invalid entries trigger error messages with specific validation failure reasons. The system displays key part specifications retrieved from TeamCenter, including material requirements, dimensional details, and compatibility information. This visibility ensures that procurement activities align with engineering specifications without requiring access to TeamCenter directly.

When the system creates purchase orders in Coupa, users receive a confirmation message with the generated purchase order number. For purchase orders requiring approval, the system displays the approval workflow status and notifies users when approvals are complete. The interface provides links to view the purchase order in Coupa, maintaining traceability between systems throughout the procurement process.

## Appendix

### A. Persona UI Screens

The Material Request System provides tailored user interfaces for each key persona in the procurement workflow. The table below outlines the specific UI screens and capabilities available to each role:

Personas:RequesterProcurement Manager (a.k.a. Approver)BuyerUI screensCreate new requestSee all/subset of requestsSee all/subset of requestsSee all/subset of requestsSee request/sub-request detailsSee request/sub-request detailsSee status and detailed of a RequestIn request details, select and route multiple line items to a new Sub-requestIn details page for only Purchasing-type sub-requests, review and push items to Coupa (possibly filter out/deselect items, and make 1 Draft Req Coupa for the selected items)Edit and resubmit rejected line itemsDetermine if Program Manager review is required for purchasing requestsDesignate whether purchased items require physical delivery to recipientSelectively reject individual line items with comments and substitute part suggestionsAdd supplier information and pricing details for items being pushed to CoupaPre-select assignees for Purchase Sub-tasks from Jira user list

This persona-based UI approach ensures that each user role has access to the specific functionality needed to perform their responsibilities within the procurement workflow, while maintaining appropriate system boundaries and access controls through integration with Okta for authentication and role management.

Additional appendices are available in Google Drive.