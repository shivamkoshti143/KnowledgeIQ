-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Aug 03, 2026 at 02:05 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `knowledgeiq`
--

-- --------------------------------------------------------

--
-- Table structure for table `ai_chats`
--

CREATE TABLE `ai_chats` (
  `id` int(11) NOT NULL,
  `userId` int(11) NOT NULL,
  `message` text NOT NULL,
  `response` text NOT NULL,
  `model` varchar(120) NOT NULL DEFAULT 'openrouter/free',
  `createdAt` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `ai_chats`
--

INSERT INTO `ai_chats` (`id`, `userId`, `message`, `response`, `model`, `createdAt`) VALUES
(21, 6, 'Database Scaling', 'I found these items in our portal:\n\n1. [REF:5:task:Database Scaling] - 🚀 Database Scaling isn’t just about handling millions of users—it’s about building systems that never stop.**\r\n\r\nIf you\n\nClick any item above to open its details.', 'meta-llama/llama-4-maverick:free', '2026-07-27 16:17:33'),
(22, 6, 'AI System Operator', 'I found these items in our portal:\n\n1. [REF:4:task:The AI System Operator: Mastering Prompt Engineering & AI Workflows] - A practical guide to mastering AI through structured prompting, context management, hallucination prevention, and profes\n2. [REF:5:task:Database Scaling] - 🚀 Database Scaling isn’t just about handling millions of users—it’s about building systems that never stop.**\r\n\r\nIf you\n\nClick any item above to open its details.', 'meta-llama/llama-4-maverick:free', '2026-07-28 11:44:48'),
(23, 1, 'CI/CD', 'I found these items in our portal:\n\n1. [REF:1:task:What is CI/CD ?] - CI/CD Handbook\n\nClick any item above to open its details.', 'meta-llama/llama-4-maverick:free', '2026-07-31 12:40:43');

-- --------------------------------------------------------

--
-- Table structure for table `bookmarks`
--

CREATE TABLE `bookmarks` (
  `id` int(11) NOT NULL,
  `userId` int(11) NOT NULL,
  `contentType` enum('video','task','knowledge') NOT NULL,
  `contentId` int(11) NOT NULL,
  `createdAt` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `bookmarks`
--

INSERT INTO `bookmarks` (`id`, `userId`, `contentType`, `contentId`, `createdAt`) VALUES
(1, 1, 'task', 3, '2026-07-31 12:40:06'),
(2, 3, 'task', 5, '2026-07-31 12:58:20');

-- --------------------------------------------------------

--
-- Table structure for table `categories`
--

CREATE TABLE `categories` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `categories`
--

INSERT INTO `categories` (`id`, `name`, `createdAt`) VALUES
(2, 'Task', '2026-07-23 06:57:25'),
(3, 'Documentation', '2026-07-23 06:57:25'),
(4, 'Bug Report', '2026-07-23 06:57:25'),
(5, 'Feature Request', '2026-07-23 06:57:25');

-- --------------------------------------------------------

--
-- Table structure for table `comments`
--

CREATE TABLE `comments` (
  `id` int(11) NOT NULL,
  `videoId` int(11) DEFAULT NULL,
  `taskId` int(11) DEFAULT NULL,
  `userId` int(11) NOT NULL,
  `parentId` int(11) DEFAULT NULL,
  `body` text NOT NULL,
  `createdAt` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `comments`
--

INSERT INTO `comments` (`id`, `videoId`, `taskId`, `userId`, `parentId`, `body`, `createdAt`) VALUES
(1, NULL, 5, 1, NULL, 'This is nice!', '2026-07-31 06:58:44'),
(2, NULL, 5, 6, 1, 'Thank you Karthi.', '2026-07-31 06:59:29');

-- --------------------------------------------------------

--
-- Table structure for table `departments`
--

CREATE TABLE `departments` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT '',
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `departments`
--

INSERT INTO `departments` (`id`, `name`, `description`, `createdAt`) VALUES
(2, 'IT', 'Infrastructure, access, and helpdesk operations', '2026-07-23 06:57:25'),
(3, 'SQA', 'Software quality assurance playbooks', '2026-07-23 06:57:25'),
(4, 'Testers', 'Manual and automation testing guidance', '2026-07-23 06:57:25'),
(5, 'HR', 'People operations and employee services', '2026-07-23 06:57:25'),
(8, 'Developer', '', '2026-07-24 06:37:06');

-- --------------------------------------------------------

--
-- Table structure for table `knowledge_posts`
--

CREATE TABLE `knowledge_posts` (
  `id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT '',
  `tags` varchar(500) DEFAULT '',
  `contentType` enum('text','file','video') DEFAULT 'text',
  `fileUrl` varchar(500) DEFAULT '',
  `fileExtension` varchar(50) DEFAULT '',
  `departmentId` int(11) DEFAULT NULL,
  `categoryId` int(11) DEFAULT NULL,
  `uploaderId` int(11) NOT NULL,
  `status` enum('published','draft') DEFAULT 'published',
  `createdAt` datetime DEFAULT current_timestamp(),
  `isRecommended` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `knowledge_post_files`
--

CREATE TABLE `knowledge_post_files` (
  `id` int(11) NOT NULL,
  `knowledgePostId` int(11) NOT NULL,
  `fileUrl` varchar(500) DEFAULT '',
  `fileExtension` varchar(50) DEFAULT '',
  `createdAt` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` int(11) NOT NULL,
  `userId` int(11) NOT NULL,
  `type` varchar(50) NOT NULL,
  `message` text NOT NULL,
  `videoId` int(11) DEFAULT NULL,
  `taskId` int(11) DEFAULT NULL,
  `commentId` int(11) DEFAULT NULL,
  `readAt` datetime DEFAULT NULL,
  `createdAt` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `notifications`
--

INSERT INTO `notifications` (`id`, `userId`, `type`, `message`, `videoId`, `taskId`, `commentId`, `readAt`, `createdAt`) VALUES
(1, 3, 'task_approval_queue', 'What is CI/CD ? is waiting for review.', NULL, 1, NULL, '2026-07-27 06:58:38', '2026-07-27 06:24:59'),
(2, 3, 'task_approval_queue', 'What is DSA ? is waiting for review.', NULL, 2, NULL, '2026-07-27 06:58:38', '2026-07-27 06:25:33'),
(3, 3, 'task_approval_queue', 'What is DSA ? is waiting for review.', NULL, 3, NULL, '2026-07-27 06:58:38', '2026-07-27 06:26:50'),
(4, 3, 'task_approval_queue', 'The AI System Operator: Mastering Prompt Engineering & AI Workflows is waiting for review.', NULL, 4, NULL, '2026-07-27 06:58:38', '2026-07-27 06:28:55'),
(5, 6, 'task_approved', 'Your task \"What is CI/CD ?\" has been approved.', NULL, 1, NULL, '2026-07-27 06:47:12', '2026-07-27 06:29:02'),
(6, 6, 'task_approved', 'Your task \"What is DSA ?\" has been approved.', NULL, 3, NULL, '2026-07-27 06:47:12', '2026-07-27 06:29:03'),
(7, 6, 'task_approved', 'Your task \"The AI System Operator: Mastering Prompt Engineering & AI Workflows\" has been approved.', NULL, 4, NULL, '2026-07-27 06:47:12', '2026-07-27 06:29:04'),
(8, 3, 'task_approval_queue', 'Database Scaling is waiting for review.', NULL, 5, NULL, '2026-07-27 06:58:38', '2026-07-27 06:35:23'),
(9, 6, 'task_approved', 'Your task \"Database Scaling\" has been approved.', NULL, 5, NULL, '2026-07-27 06:47:12', '2026-07-27 06:35:39'),
(10, 3, 'task_approval_queue', 'Deletable Task is waiting for review.', NULL, 6, NULL, '2026-07-27 06:58:38', '2026-07-27 06:52:50'),
(11, 3, 'task_approval_queue', 'dssddssd is waiting for review.', NULL, 7, NULL, NULL, '2026-07-27 07:11:48'),
(12, 3, 'task_approval_queue', 'Deletable Task Verify is waiting for review.', NULL, 8, NULL, NULL, '2026-07-27 07:37:25'),
(13, 3, 'task_approval_queue', 'This is the Title of the Knowledge Submission. is waiting for review.', NULL, 9, NULL, NULL, '2026-07-31 06:54:44'),
(14, 6, 'reply', 'Karthik added a discussion reply on \"Database Scaling\".', NULL, 5, 1, NULL, '2026-07-31 06:58:44'),
(15, 1, 'reply', 'Shivam Koshti added a discussion reply on \"Database Scaling\".', NULL, 5, 2, '2026-07-31 07:14:06', '2026-07-31 06:59:29'),
(16, 6, 'task_approved', 'Your task \"This is the Title of the Knowledge Submission.\" has been approved.', NULL, 9, NULL, NULL, '2026-07-31 07:18:22'),
(17, 6, 'task_rejected', 'Your task \"dssddssd\" has been rejected.', NULL, 7, NULL, NULL, '2026-07-31 07:23:34');

-- --------------------------------------------------------

--
-- Table structure for table `site_settings`
--

CREATE TABLE `site_settings` (
  `id` int(11) NOT NULL,
  `portalName` varchar(255) DEFAULT 'ABM TaskIQ',
  `logoUrl` varchar(500) DEFAULT '',
  `faviconUrl` varchar(500) DEFAULT '',
  `updatedAt` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `site_settings`
--

INSERT INTO `site_settings` (`id`, `portalName`, `logoUrl`, `faviconUrl`, `updatedAt`) VALUES
(1, 'ABM KnowledgeIQ', '/uploads/site-1784805861588-390542331.png', '/uploads/site-1784805861589-504512.png', '2026-07-31 12:52:37');

-- --------------------------------------------------------

--
-- Table structure for table `tags`
--

CREATE TABLE `tags` (
  `id` int(11) NOT NULL,
  `name` varchar(50) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tasks`
--

CREATE TABLE `tasks` (
  `id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT '',
  `departmentId` int(11) DEFAULT NULL,
  `categoryId` int(11) DEFAULT NULL,
  `uploaderId` int(11) NOT NULL,
  `fileUrl` varchar(500) DEFAULT '',
  `fileExtension` varchar(50) DEFAULT '',
  `status` enum('pending','approved','rejected') DEFAULT 'pending',
  `rejectionRemarks` text DEFAULT NULL,
  `approvedBy` int(11) DEFAULT NULL,
  `approvedAt` datetime DEFAULT NULL,
  `createdAt` datetime DEFAULT current_timestamp(),
  `isRecommended` tinyint(1) NOT NULL DEFAULT 0,
  `tags` varchar(500) DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tasks`
--

INSERT INTO `tasks` (`id`, `title`, `description`, `departmentId`, `categoryId`, `uploaderId`, `fileUrl`, `fileExtension`, `status`, `rejectionRemarks`, `approvedBy`, `approvedAt`, `createdAt`, `isRecommended`, `tags`) VALUES
(1, 'What is CI/CD ?', 'CI/CD Handbook', 8, 3, 6, '', '', 'approved', NULL, 3, '2026-07-27 06:29:02', '2026-07-27 11:54:59', 0, 'CI, CD, Deployment, Server'),
(3, 'What is DSA ?', 'DSA Patterns Handbook', 8, 3, 6, '', '', 'approved', NULL, 3, '2026-07-27 06:29:03', '2026-07-27 11:56:50', 0, 'DSA, Architecture'),
(4, 'The AI System Operator: Mastering Prompt Engineering & AI Workflows', 'A practical guide to mastering AI through structured prompting, context management, hallucination prevention, and professional-grade workflows. Learn how to transform ChatGPT into a reliable assistant for business, research, and decision-making.', 8, 3, 6, '', '', 'approved', NULL, 3, '2026-07-27 06:29:04', '2026-07-27 11:58:55', 1, 'AI, ChatGPT, Prompt Engineering, AI Workflows, Generative AI, LLM, AI Automation, Hallucination Prevention, AI Reasoning, Context Management'),
(5, 'Database Scaling', '🚀 Database Scaling isn’t just about handling millions of users—it’s about building systems that never stop.**\r\n\r\nIf you’ve ever been confused about **Replication, Sharding, Caching, Load Balancing, CAP Theorem, High Availability, or Database Scaling**, this handbook is for you.\r\n\r\n✅ Vertical vs Horizontal Scaling\r\n✅ Database Replication (Master-Slave & Read Replicas)\r\n✅ Sharding Strategies & Consistent Hashing\r\n✅ Redis Caching Patterns & Cache Invalidation\r\n✅ Load Balancing Algorithms (L4 vs L7)\r\n✅ CAP Theorem & ACID vs BASE\r\n✅ High Availability & Disaster Recovery\r\n✅ Production Best Practices\r\n✅ Database Scaling Architecture Diagrams\r\n✅ Top Backend Interview Questions & Quick Revision', 8, 3, 6, '', '', 'approved', NULL, 3, '2026-07-27 06:35:39', '2026-07-27 12:05:23', 0, 'DatabaseScaling, SystemDesign, BackendDeveloper, SoftwareEngineer, Redis, MySQL, PostgreSQL, Caching, LoadBalancing, Sharding, Replication, CAPTheorem, HighAvailability, DistributedSystems, BackendInterview, TechNotes, Programming, Coding'),
(7, 'dssddssd', 'dssdsdsd', 8, 4, 6, '', '', 'rejected', 'This is reason', 3, NULL, '2026-07-27 12:41:48', 0, ''),
(9, 'This is the Title of the Knowledge Submission.', 'This is the Description of the Knowledge Description.', 8, 4, 6, '', '', 'approved', NULL, 3, '2026-07-31 07:18:22', '2026-07-31 12:24:44', 0, 'Knowledge, Developer');

-- --------------------------------------------------------

--
-- Table structure for table `task_files`
--

CREATE TABLE `task_files` (
  `id` int(11) NOT NULL,
  `taskId` int(11) NOT NULL,
  `fileUrl` varchar(500) DEFAULT '',
  `fileExtension` varchar(50) DEFAULT '',
  `createdAt` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `task_files`
--

INSERT INTO `task_files` (`id`, `taskId`, `fileUrl`, `fileExtension`, `createdAt`) VALUES
(1, 1, '/uploads/1785133499636-998216095.jpg', 'jpg', '2026-07-27 11:54:59'),
(2, 1, '/uploads/1785133499649-222219229.jpg', 'jpg', '2026-07-27 11:54:59'),
(3, 1, '/uploads/1785133499656-620312732.jpg', 'jpg', '2026-07-27 11:54:59'),
(4, 1, '/uploads/1785133499661-730259909.jpg', 'jpg', '2026-07-27 11:54:59'),
(5, 1, '/uploads/1785133499687-778457748.jpg', 'jpg', '2026-07-27 11:54:59'),
(6, 1, '/uploads/1785133499692-928803869.jpg', 'jpg', '2026-07-27 11:54:59'),
(7, 1, '/uploads/1785133499704-430908950.jpg', 'jpg', '2026-07-27 11:54:59'),
(8, 1, '/uploads/1785133499717-843768282.jpg', 'jpg', '2026-07-27 11:54:59'),
(9, 1, '/uploads/1785133499727-905100622.jpg', 'jpg', '2026-07-27 11:54:59'),
(10, 1, '/uploads/1785133499739-319859079.jpg', 'jpg', '2026-07-27 11:54:59'),
(11, 3, '/uploads/1785133610475-779737883.pdf', 'pdf', '2026-07-27 11:56:50'),
(12, 4, '/uploads/1785133735085-66782299.pdf', 'pdf', '2026-07-27 11:58:55'),
(13, 5, '/uploads/1785134123258-488263090.jpg', 'jpg', '2026-07-27 12:05:23'),
(14, 5, '/uploads/1785134123263-901966994.jpg', 'jpg', '2026-07-27 12:05:23'),
(15, 5, '/uploads/1785134123270-40390797.jpg', 'jpg', '2026-07-27 12:05:23'),
(16, 5, '/uploads/1785134123274-442205264.jpg', 'jpg', '2026-07-27 12:05:23'),
(17, 5, '/uploads/1785134123279-242700728.jpg', 'jpg', '2026-07-27 12:05:23'),
(18, 5, '/uploads/1785134123283-832382631.jpg', 'jpg', '2026-07-27 12:05:23'),
(19, 5, '/uploads/1785134123287-607889466.jpg', 'jpg', '2026-07-27 12:05:23'),
(20, 5, '/uploads/1785134123298-303597809.jpg', 'jpg', '2026-07-27 12:05:23'),
(21, 5, '/uploads/1785134123301-545117660.jpg', 'jpg', '2026-07-27 12:05:23'),
(22, 5, '/uploads/1785134123304-5398128.jpg', 'jpg', '2026-07-27 12:05:23'),
(23, 9, '/uploads/1785480884160-923775691.png', 'png', '2026-07-31 12:24:44'),
(24, 9, '/uploads/1785480884170-451906683.pdf', 'pdf', '2026-07-31 12:24:44'),
(25, 9, '/uploads/1785480884316-538601290.docx', 'docx', '2026-07-31 12:24:44'),
(26, 9, '/uploads/1785480884318-516823947.mp4', 'mp4', '2026-07-31 12:24:44');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(150) NOT NULL,
  `passwordHash` varchar(255) NOT NULL,
  `role` enum('admin','employee') DEFAULT 'employee',
  `departmentId` int(11) DEFAULT NULL,
  `title` varchar(100) DEFAULT '',
  `status` enum('active','inactive') DEFAULT 'active',
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `passwordHash`, `role`, `departmentId`, `title`, `status`, `createdAt`) VALUES
(1, 'Karthik', 'karthik@abm.com', '$2a$08$FspO7RrL1/WAop98hVpAFu93m1lh49yr2aRYlx9/2u0icFjHLnqhO', 'employee', NULL, 'Developer', 'active', '2026-07-23 06:57:25'),
(2, 'Priya S', 'priya@abm.com', '$2a$08$FspO7RrL1/WAop98hVpAFu93m1lh49yr2aRYlx9/2u0icFjHLnqhO', 'employee', 3, 'SQA Lead', 'active', '2026-07-23 06:57:25'),
(3, 'Admin User', 'admin@abm.com', '$2a$08$HzsfoEkBfOPla2O8VwYCROHRkTvGnChhc.SfC9myaUK3f3kHA6M5q', 'admin', 2, 'Platform Admin', 'active', '2026-07-23 06:57:25'),
(4, 'Arjun M', 'arjun@abm.com', '$2a$08$FspO7RrL1/WAop98hVpAFu93m1lh49yr2aRYlx9/2u0icFjHLnqhO', 'employee', 2, 'IT Analyst', 'active', '2026-07-23 06:57:25'),
(6, 'Shivam Koshti', 'shivam.koshti@abmindia.com', '$2a$08$JgIwXfk8CRjz05.mOch9HODyTHJUCt/V9bia0QhqVj3LQ0mdjR45K', 'employee', 8, 'Employee', 'active', '2026-07-24 06:44:01');

-- --------------------------------------------------------

--
-- Table structure for table `videos`
--

CREATE TABLE `videos` (
  `id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT '',
  `departmentId` int(11) DEFAULT NULL,
  `categoryId` int(11) DEFAULT NULL,
  `uploaderId` int(11) NOT NULL,
  `tags` text DEFAULT '',
  `status` enum('pending','approved','rejected','draft') DEFAULT 'pending',
  `rejectionRemarks` text DEFAULT NULL,
  `approvedBy` int(11) DEFAULT NULL,
  `approvedAt` datetime DEFAULT NULL,
  `videoUrl` varchar(500) DEFAULT '',
  `fileExtension` varchar(50) DEFAULT '',
  `viewCount` int(11) DEFAULT 0,
  `duration` varchar(10) DEFAULT '00:00',
  `thumbnail` varchar(50) DEFAULT 'upload',
  `createdAt` datetime DEFAULT current_timestamp(),
  `isRecommended` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `ai_chats`
--
ALTER TABLE `ai_chats`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_ai_chats_user` (`userId`);

--
-- Indexes for table `bookmarks`
--
ALTER TABLE `bookmarks`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_bookmark` (`userId`,`contentType`,`contentId`),
  ADD KEY `idx_bookmarks_user` (`userId`),
  ADD KEY `idx_bookmarks_content` (`contentType`,`contentId`);

--
-- Indexes for table `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `comments`
--
ALTER TABLE `comments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `userId` (`userId`),
  ADD KEY `parentId` (`parentId`),
  ADD KEY `idx_comments_video` (`videoId`),
  ADD KEY `idx_comments_task` (`taskId`);

--
-- Indexes for table `departments`
--
ALTER TABLE `departments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `knowledge_posts`
--
ALTER TABLE `knowledge_posts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `uploaderId` (`uploaderId`),
  ADD KEY `idx_knowledge_department` (`departmentId`),
  ADD KEY `idx_knowledge_status` (`status`);

--
-- Indexes for table `knowledge_post_files`
--
ALTER TABLE `knowledge_post_files`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_knowledge_post_files_post` (`knowledgePostId`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_notifications_user` (`userId`);

--
-- Indexes for table `site_settings`
--
ALTER TABLE `site_settings`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `tags`
--
ALTER TABLE `tags`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `tasks`
--
ALTER TABLE `tasks`
  ADD PRIMARY KEY (`id`),
  ADD KEY `uploaderId` (`uploaderId`),
  ADD KEY `idx_tasks_status` (`status`),
  ADD KEY `idx_tasks_department` (`departmentId`),
  ADD KEY `tasks_ibfk_2` (`categoryId`);

--
-- Indexes for table `task_files`
--
ALTER TABLE `task_files`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_task_files_task` (`taskId`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `videos`
--
ALTER TABLE `videos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `uploaderId` (`uploaderId`),
  ADD KEY `idx_videos_status` (`status`),
  ADD KEY `idx_videos_department` (`departmentId`),
  ADD KEY `idx_videos_category` (`categoryId`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `ai_chats`
--
ALTER TABLE `ai_chats`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;

--
-- AUTO_INCREMENT for table `bookmarks`
--
ALTER TABLE `bookmarks`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `categories`
--
ALTER TABLE `categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `comments`
--
ALTER TABLE `comments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `departments`
--
ALTER TABLE `departments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `knowledge_posts`
--
ALTER TABLE `knowledge_posts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `knowledge_post_files`
--
ALTER TABLE `knowledge_post_files`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT for table `site_settings`
--
ALTER TABLE `site_settings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `tags`
--
ALTER TABLE `tags`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tasks`
--
ALTER TABLE `tasks`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `task_files`
--
ALTER TABLE `task_files`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=27;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `videos`
--
ALTER TABLE `videos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `ai_chats`
--
ALTER TABLE `ai_chats`
  ADD CONSTRAINT `ai_chats_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `bookmarks`
--
ALTER TABLE `bookmarks`
  ADD CONSTRAINT `bookmarks_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `comments`
--
ALTER TABLE `comments`
  ADD CONSTRAINT `comments_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `comments_ibfk_2` FOREIGN KEY (`parentId`) REFERENCES `comments` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `knowledge_posts`
--
ALTER TABLE `knowledge_posts`
  ADD CONSTRAINT `knowledge_posts_ibfk_1` FOREIGN KEY (`departmentId`) REFERENCES `departments` (`id`),
  ADD CONSTRAINT `knowledge_posts_ibfk_2` FOREIGN KEY (`uploaderId`) REFERENCES `users` (`id`);

--
-- Constraints for table `knowledge_post_files`
--
ALTER TABLE `knowledge_post_files`
  ADD CONSTRAINT `knowledge_post_files_ibfk_1` FOREIGN KEY (`knowledgePostId`) REFERENCES `knowledge_posts` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`);

--
-- Constraints for table `tasks`
--
ALTER TABLE `tasks`
  ADD CONSTRAINT `tasks_ibfk_1` FOREIGN KEY (`departmentId`) REFERENCES `departments` (`id`),
  ADD CONSTRAINT `tasks_ibfk_2` FOREIGN KEY (`categoryId`) REFERENCES `categories` (`id`),
  ADD CONSTRAINT `tasks_ibfk_3` FOREIGN KEY (`uploaderId`) REFERENCES `users` (`id`);

--
-- Constraints for table `task_files`
--
ALTER TABLE `task_files`
  ADD CONSTRAINT `task_files_ibfk_1` FOREIGN KEY (`taskId`) REFERENCES `tasks` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `videos`
--
ALTER TABLE `videos`
  ADD CONSTRAINT `videos_ibfk_1` FOREIGN KEY (`departmentId`) REFERENCES `departments` (`id`),
  ADD CONSTRAINT `videos_ibfk_2` FOREIGN KEY (`categoryId`) REFERENCES `categories` (`id`),
  ADD CONSTRAINT `videos_ibfk_3` FOREIGN KEY (`uploaderId`) REFERENCES `users` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
