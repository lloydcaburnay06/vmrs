-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Mar 06, 2026 at 08:17 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `vmrs`
--

-- --------------------------------------------------------

--
-- Table structure for table `audit_logs`
--

CREATE TABLE `audit_logs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `action` varchar(80) NOT NULL,
  `entity_type` varchar(80) NOT NULL,
  `entity_id` bigint(20) UNSIGNED DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` varchar(255) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`payload`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `audit_logs`
--

INSERT INTO `audit_logs` (`id`, `user_id`, `action`, `entity_type`, `entity_id`, `ip_address`, `user_agent`, `payload`, `created_at`) VALUES
(1, 1, 'seed.insert', 'reservation', 3, '127.0.0.1', 'seed-script', '{\"reservation_no\": \"RES-2026-0003\", \"status\": \"pending\"}', '2026-02-19 06:12:06');

-- --------------------------------------------------------

--
-- Table structure for table `driver_profiles`
--

CREATE TABLE `driver_profiles` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `dl_id_number` varchar(60) NOT NULL,
  `license_expiry` date NOT NULL,
  `assignment_type` enum('administrative','ambulance') NOT NULL DEFAULT 'ambulance',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ;

--
-- Dumping data for table `driver_profiles`
--

INSERT INTO `driver_profiles` (`id`, `user_id`, `dl_id_number`, `license_expiry`, `assignment_type`, `created_at`, `updated_at`) VALUES
(1, 3, 'DL-DRV-0001', '2027-12-31', 'administrative', '2026-02-19 06:36:37', '2026-02-20 00:50:09'),
(5, 26, 'DL-DRV-0002', '2027-11-30', 'administrative', '2026-02-19 08:40:43', '2026-02-20 00:50:06'),
(6, 27, 'DL-DRV-0003', '2027-10-31', 'ambulance', '2026-02-19 08:40:43', '2026-02-19 08:40:43'),
(7, 28, 'DL-DRV-0004', '2028-01-31', 'ambulance', '2026-02-19 08:40:43', '2026-02-19 08:40:43'),
(8, 29, 'DL-DRV-0005', '2027-09-30', 'ambulance', '2026-02-19 08:40:43', '2026-02-19 08:40:43');

-- --------------------------------------------------------

--
-- Table structure for table `driver_work_schedules`
--

CREATE TABLE `driver_work_schedules` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `driver_id` bigint(20) UNSIGNED NOT NULL,
  `work_date` date NOT NULL,
  `start_time` time DEFAULT NULL,
  `end_time` time DEFAULT NULL,
  `shift_code` enum('S8_5','S6_2','S2_10','S10_6','OFF','H_OFF','CO','LEAVE','OB','OT') NOT NULL DEFAULT 'S8_5',
  `shift_type` enum('regular','overtime','off','leave') NOT NULL DEFAULT 'regular',
  `status` enum('scheduled','completed','cancelled') NOT NULL DEFAULT 'scheduled',
  `notes` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `driver_work_schedules`
--

INSERT INTO `driver_work_schedules` (`id`, `driver_id`, `work_date`, `start_time`, `end_time`, `shift_code`, `shift_type`, `status`, `notes`, `created_at`, `updated_at`) VALUES
(181, 3, '2026-02-22', NULL, NULL, 'OFF', 'off', 'scheduled', 'Auto-generated weekly schedule', '2026-02-20 01:03:09', '2026-02-20 01:03:09'),
(182, 26, '2026-02-22', NULL, NULL, 'OFF', 'off', 'scheduled', 'Auto-generated weekly schedule', '2026-02-20 01:03:09', '2026-02-20 01:03:09'),
(183, 27, '2026-02-22', NULL, NULL, 'OFF', 'off', 'scheduled', 'Auto-generated weekly schedule', '2026-02-20 01:03:09', '2026-02-20 01:03:09'),
(184, 28, '2026-02-22', '08:00:00', '17:00:00', 'S8_5', 'regular', 'scheduled', 'Auto-generated weekly schedule', '2026-02-20 01:03:09', '2026-02-20 01:03:09'),
(185, 29, '2026-02-22', '06:00:00', '14:00:00', 'S6_2', 'regular', 'scheduled', 'Auto-generated weekly schedule', '2026-02-20 01:03:09', '2026-02-20 01:03:09'),
(186, 3, '2026-02-23', '08:00:00', '17:00:00', 'S8_5', 'regular', 'scheduled', 'Auto-generated weekly schedule', '2026-02-20 01:03:09', '2026-02-20 01:03:09'),
(187, 26, '2026-02-23', '08:00:00', '17:00:00', 'S8_5', 'regular', 'scheduled', 'Auto-generated weekly schedule', '2026-02-20 01:03:09', '2026-02-20 01:03:09'),
(188, 28, '2026-02-23', NULL, NULL, 'OFF', 'off', 'scheduled', 'Auto-generated weekly schedule', '2026-02-20 01:03:09', '2026-02-20 01:03:09'),
(189, 27, '2026-02-23', '06:00:00', '14:00:00', 'S6_2', 'regular', 'scheduled', 'Auto-generated weekly schedule', '2026-02-20 01:03:09', '2026-02-20 01:03:09'),
(190, 29, '2026-02-23', '08:00:00', '17:00:00', 'S8_5', 'regular', 'scheduled', 'Auto-generated weekly schedule', '2026-02-20 01:03:09', '2026-02-20 01:03:09'),
(191, 3, '2026-02-24', '08:00:00', '17:00:00', 'S8_5', 'regular', 'scheduled', 'Auto-generated weekly schedule', '2026-02-20 01:03:09', '2026-02-20 01:03:09'),
(192, 26, '2026-02-24', '08:00:00', '17:00:00', 'S8_5', 'regular', 'scheduled', 'Auto-generated weekly schedule', '2026-02-20 01:03:09', '2026-02-20 01:03:09'),
(193, 29, '2026-02-24', NULL, NULL, 'OFF', 'off', 'scheduled', 'Auto-generated weekly schedule', '2026-02-20 01:03:09', '2026-02-20 01:03:09'),
(194, 27, '2026-02-24', '08:00:00', '17:00:00', 'S8_5', 'regular', 'scheduled', 'Auto-generated weekly schedule', '2026-02-20 01:03:10', '2026-02-20 01:03:10'),
(195, 28, '2026-02-24', '06:00:00', '14:00:00', 'S6_2', 'regular', 'scheduled', 'Auto-generated weekly schedule', '2026-02-20 01:03:10', '2026-02-20 01:03:10'),
(196, 3, '2026-02-25', '08:00:00', '17:00:00', 'S8_5', 'regular', 'scheduled', 'Auto-generated weekly schedule', '2026-02-20 01:03:10', '2026-02-20 01:03:10'),
(197, 26, '2026-02-25', '08:00:00', '17:00:00', 'S8_5', 'regular', 'scheduled', 'Auto-generated weekly schedule', '2026-02-20 01:03:10', '2026-02-20 01:03:10'),
(198, 27, '2026-02-25', NULL, NULL, 'OFF', 'off', 'scheduled', 'Auto-generated weekly schedule', '2026-02-20 01:03:10', '2026-02-20 01:03:10'),
(199, 28, '2026-02-25', '08:00:00', '17:00:00', 'S8_5', 'regular', 'scheduled', 'Auto-generated weekly schedule', '2026-02-20 01:03:10', '2026-02-20 01:03:10'),
(200, 29, '2026-02-25', '06:00:00', '14:00:00', 'S6_2', 'regular', 'scheduled', 'Auto-generated weekly schedule', '2026-02-20 01:03:10', '2026-02-20 01:03:10'),
(201, 3, '2026-02-26', '08:00:00', '17:00:00', 'S8_5', 'regular', 'scheduled', 'Auto-generated weekly schedule', '2026-02-20 01:03:10', '2026-02-20 01:03:10'),
(202, 26, '2026-02-26', '08:00:00', '17:00:00', 'S8_5', 'regular', 'scheduled', 'Auto-generated weekly schedule', '2026-02-20 01:03:10', '2026-02-20 01:03:10'),
(203, 28, '2026-02-26', NULL, NULL, 'OFF', 'off', 'scheduled', 'Auto-generated weekly schedule', '2026-02-20 01:03:10', '2026-02-20 01:03:10'),
(204, 27, '2026-02-26', '08:00:00', '17:00:00', 'S8_5', 'regular', 'scheduled', 'Auto-generated weekly schedule', '2026-02-20 01:03:10', '2026-02-20 01:03:10'),
(205, 29, '2026-02-26', '14:00:00', '22:00:00', 'S2_10', 'regular', 'scheduled', 'Auto-generated weekly schedule', '2026-02-20 01:03:10', '2026-02-20 01:03:10'),
(206, 3, '2026-02-27', '08:00:00', '17:00:00', 'S8_5', 'regular', 'scheduled', 'Auto-generated weekly schedule', '2026-02-20 01:03:10', '2026-02-20 01:03:10'),
(207, 26, '2026-02-27', '08:00:00', '17:00:00', 'S8_5', 'regular', 'scheduled', 'Auto-generated weekly schedule', '2026-02-20 01:03:10', '2026-02-20 01:03:10'),
(208, 29, '2026-02-27', NULL, NULL, 'OFF', 'off', 'scheduled', 'Auto-generated weekly schedule', '2026-02-20 01:03:10', '2026-02-20 01:03:10'),
(209, 27, '2026-02-27', '06:00:00', '14:00:00', 'S6_2', 'regular', 'scheduled', 'Auto-generated weekly schedule', '2026-02-20 01:03:10', '2026-02-20 01:03:10'),
(210, 28, '2026-02-27', '22:00:00', '06:00:00', 'S10_6', 'regular', 'scheduled', 'Auto-generated weekly schedule', '2026-02-20 01:03:10', '2026-02-20 01:03:10'),
(211, 3, '2026-02-28', NULL, NULL, 'OFF', 'off', 'scheduled', 'Auto-generated weekly schedule', '2026-02-20 01:03:10', '2026-02-20 01:03:10'),
(212, 26, '2026-02-28', NULL, NULL, 'OFF', 'off', 'scheduled', 'Auto-generated weekly schedule', '2026-02-20 01:03:10', '2026-02-20 01:03:10'),
(213, 27, '2026-02-28', NULL, NULL, 'OFF', 'off', 'scheduled', 'Auto-generated weekly schedule', '2026-02-20 01:03:10', '2026-02-20 01:03:10'),
(214, 28, '2026-02-28', '14:00:00', '22:00:00', 'S2_10', 'regular', 'scheduled', 'Auto-generated weekly schedule', '2026-02-20 01:03:10', '2026-02-20 01:03:10'),
(215, 29, '2026-02-28', '08:00:00', '17:00:00', 'S8_5', 'regular', 'scheduled', 'Auto-generated weekly schedule', '2026-02-20 01:03:10', '2026-02-20 01:03:10'),
(216, 3, '2026-03-01', NULL, NULL, 'OFF', 'off', 'scheduled', 'Auto-generated weekly schedule', '2026-02-20 01:15:16', '2026-02-20 01:15:16'),
(217, 26, '2026-03-01', NULL, NULL, 'OFF', 'off', 'scheduled', 'Auto-generated weekly schedule', '2026-02-20 01:15:16', '2026-02-20 01:15:16'),
(218, 28, '2026-03-01', NULL, NULL, 'OFF', 'off', 'scheduled', 'Auto-generated weekly schedule', '2026-02-20 01:15:16', '2026-02-20 01:15:16'),
(219, 27, '2026-03-01', '14:00:00', '22:00:00', 'S2_10', 'regular', 'scheduled', 'Auto-generated weekly schedule', '2026-02-20 01:15:16', '2026-02-20 01:15:16'),
(220, 29, '2026-03-01', '22:00:00', '06:00:00', 'S10_6', 'regular', 'scheduled', 'Auto-generated weekly schedule', '2026-02-20 01:15:16', '2026-02-20 01:15:16'),
(221, 3, '2026-03-02', '08:00:00', '17:00:00', 'S8_5', 'regular', 'scheduled', 'Auto-generated weekly schedule', '2026-02-20 01:15:16', '2026-02-20 01:15:16'),
(222, 26, '2026-03-02', '08:00:00', '17:00:00', 'S8_5', 'regular', 'scheduled', 'Auto-generated weekly schedule', '2026-02-20 01:15:16', '2026-02-20 01:15:16'),
(223, 29, '2026-03-02', NULL, NULL, 'OFF', 'off', 'scheduled', 'Auto-generated weekly schedule', '2026-02-20 01:15:16', '2026-02-20 01:15:16'),
(224, 27, '2026-03-02', '22:00:00', '06:00:00', 'S10_6', 'regular', 'scheduled', 'Auto-generated weekly schedule', '2026-02-20 01:15:16', '2026-02-20 01:15:16'),
(225, 28, '2026-03-02', '06:00:00', '14:00:00', 'S6_2', 'regular', 'scheduled', 'Auto-generated weekly schedule', '2026-02-20 01:15:16', '2026-02-20 01:15:16'),
(226, 3, '2026-03-03', '08:00:00', '17:00:00', 'S8_5', 'regular', 'scheduled', 'Auto-generated weekly schedule', '2026-02-20 01:15:16', '2026-02-20 01:15:16'),
(227, 26, '2026-03-03', '08:00:00', '17:00:00', 'S8_5', 'regular', 'scheduled', 'Auto-generated weekly schedule', '2026-02-20 01:15:16', '2026-02-20 01:15:16'),
(228, 27, '2026-03-03', NULL, NULL, 'OFF', 'off', 'scheduled', 'Auto-generated weekly schedule', '2026-02-20 01:15:16', '2026-02-20 01:15:16'),
(229, 28, '2026-03-03', '06:00:00', '14:00:00', 'S6_2', 'regular', 'scheduled', 'Auto-generated weekly schedule', '2026-02-20 01:15:16', '2026-02-20 01:15:16'),
(230, 29, '2026-03-03', '08:00:00', '17:00:00', 'S8_5', 'regular', 'scheduled', 'Auto-generated weekly schedule', '2026-02-20 01:15:16', '2026-02-20 01:15:16'),
(231, 3, '2026-03-04', '08:00:00', '17:00:00', 'S8_5', 'regular', 'scheduled', 'Auto-generated weekly schedule', '2026-02-20 01:15:16', '2026-02-20 01:15:16'),
(232, 26, '2026-03-04', '08:00:00', '17:00:00', 'S8_5', 'regular', 'scheduled', 'Auto-generated weekly schedule', '2026-02-20 01:15:16', '2026-02-20 01:15:16'),
(233, 28, '2026-03-04', NULL, NULL, 'OFF', 'off', 'scheduled', 'Auto-generated weekly schedule', '2026-02-20 01:15:16', '2026-02-20 01:15:16'),
(234, 27, '2026-03-04', '06:00:00', '14:00:00', 'S6_2', 'regular', 'scheduled', 'Auto-generated weekly schedule', '2026-02-20 01:15:16', '2026-02-20 01:15:16'),
(235, 29, '2026-03-04', '14:00:00', '22:00:00', 'S2_10', 'regular', 'scheduled', 'Auto-generated weekly schedule', '2026-02-20 01:15:17', '2026-02-20 01:15:17'),
(236, 3, '2026-03-05', '08:00:00', '17:00:00', 'S8_5', 'regular', 'scheduled', 'Auto-generated weekly schedule', '2026-02-20 01:15:17', '2026-02-20 01:15:17'),
(237, 26, '2026-03-05', '08:00:00', '17:00:00', 'S8_5', 'regular', 'scheduled', 'Auto-generated weekly schedule', '2026-02-20 01:15:17', '2026-02-20 01:15:17'),
(238, 29, '2026-03-05', NULL, NULL, 'OFF', 'off', 'scheduled', 'Auto-generated weekly schedule', '2026-02-20 01:15:17', '2026-02-20 01:15:17'),
(239, 27, '2026-03-05', '08:00:00', '17:00:00', 'S8_5', 'regular', 'scheduled', 'Auto-generated weekly schedule', '2026-02-20 01:15:17', '2026-02-20 01:15:17'),
(240, 28, '2026-03-05', '14:00:00', '22:00:00', 'S2_10', 'regular', 'scheduled', 'Auto-generated weekly schedule', '2026-02-20 01:15:17', '2026-02-20 01:15:17'),
(241, 3, '2026-03-06', '08:00:00', '17:00:00', 'S8_5', 'regular', 'scheduled', 'Auto-generated weekly schedule', '2026-02-20 01:15:17', '2026-02-20 01:15:17'),
(242, 26, '2026-03-06', '08:00:00', '17:00:00', 'S8_5', 'regular', 'scheduled', 'Auto-generated weekly schedule', '2026-02-20 01:15:17', '2026-02-20 01:15:17'),
(243, 27, '2026-03-06', NULL, NULL, 'OFF', 'off', 'scheduled', 'Auto-generated weekly schedule', '2026-02-20 01:15:17', '2026-02-20 01:15:17'),
(244, 28, '2026-03-06', '08:00:00', '17:00:00', 'S8_5', 'regular', 'scheduled', 'Auto-generated weekly schedule', '2026-02-20 01:15:17', '2026-02-20 01:15:17'),
(245, 29, '2026-03-06', '06:00:00', '14:00:00', 'S6_2', 'regular', 'scheduled', 'Auto-generated weekly schedule', '2026-02-20 01:15:17', '2026-02-20 01:15:17'),
(246, 3, '2026-03-07', NULL, NULL, 'OFF', 'off', 'scheduled', 'Auto-generated weekly schedule', '2026-02-20 01:15:17', '2026-02-20 01:15:17'),
(247, 26, '2026-03-07', NULL, NULL, 'OFF', 'off', 'scheduled', 'Auto-generated weekly schedule', '2026-02-20 01:15:17', '2026-02-20 01:15:17'),
(248, 28, '2026-03-07', NULL, NULL, 'OFF', 'off', 'scheduled', 'Auto-generated weekly schedule', '2026-02-20 01:15:17', '2026-02-20 01:15:17'),
(249, 27, '2026-03-07', '14:00:00', '22:00:00', 'S2_10', 'regular', 'scheduled', 'Auto-generated weekly schedule', '2026-02-20 01:15:17', '2026-02-20 01:15:17'),
(250, 29, '2026-03-07', '06:00:00', '14:00:00', 'S6_2', 'regular', 'scheduled', 'Auto-generated weekly schedule', '2026-02-20 01:15:17', '2026-02-20 01:15:17');

-- --------------------------------------------------------

--
-- Table structure for table `fuel_logs`
--

CREATE TABLE `fuel_logs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `vehicle_id` bigint(20) UNSIGNED NOT NULL,
  `recorded_by` bigint(20) UNSIGNED DEFAULT NULL,
  `fueled_at` datetime NOT NULL,
  `odometer_km` decimal(12,2) DEFAULT NULL,
  `liters` decimal(10,2) NOT NULL,
  `unit_price` decimal(10,2) DEFAULT NULL,
  `total_cost` decimal(12,2) DEFAULT NULL,
  `fuel_station` varchar(150) DEFAULT NULL,
  `notes` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `fuel_logs`
--

INSERT INTO `fuel_logs` (`id`, `vehicle_id`, `recorded_by`, `fueled_at`, `odometer_km`, `liters`, `unit_price`, `total_cost`, `fuel_station`, `notes`, `created_at`) VALUES
(1, 2, 3, '2026-02-25 18:10:00', 44780.00, 48.00, 64.50, 3096.00, 'Shell C5', 'Refueled after airport run prep', '2026-02-19 06:12:06');

-- --------------------------------------------------------

--
-- Table structure for table `locations`
--

CREATE TABLE `locations` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(120) NOT NULL,
  `address_line` varchar(255) DEFAULT NULL,
  `city` varchar(120) DEFAULT NULL,
  `state` varchar(120) DEFAULT NULL,
  `postal_code` varchar(20) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `locations`
--

INSERT INTO `locations` (`id`, `name`, `address_line`, `city`, `state`, `postal_code`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'Main Garage', '120 Fleet Ave', 'Quezon City', 'NCR', '1100', 1, '2026-02-19 06:12:05', '2026-02-19 06:12:05'),
(2, 'North Depot', '88 Logistics Rd', 'Caloocan', 'NCR', '1400', 1, '2026-02-19 06:12:05', '2026-02-19 06:12:05'),
(3, 'South Hub', '25 Transport St', 'Makati', 'NCR', '1200', 1, '2026-02-19 06:12:05', '2026-02-19 06:12:05');

-- --------------------------------------------------------

--
-- Table structure for table `maintenance_records`
--

CREATE TABLE `maintenance_records` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `vehicle_id` bigint(20) UNSIGNED NOT NULL,
  `recorded_by` bigint(20) UNSIGNED DEFAULT NULL,
  `maintenance_type` enum('preventive','corrective','inspection','emergency') NOT NULL,
  `description` text NOT NULL,
  `vendor` varchar(150) DEFAULT NULL,
  `service_date` date NOT NULL,
  `odometer_km` decimal(12,2) DEFAULT NULL,
  `cost` decimal(12,2) DEFAULT NULL,
  `next_service_date` date DEFAULT NULL,
  `status` enum('open','in_progress','completed','cancelled') NOT NULL DEFAULT 'open',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `maintenance_records`
--

INSERT INTO `maintenance_records` (`id`, `vehicle_id`, `recorded_by`, `maintenance_type`, `description`, `vendor`, `service_date`, `odometer_km`, `cost`, `next_service_date`, `status`, `created_at`, `updated_at`) VALUES
(1, 3, 2, 'preventive', 'Oil change and brake pad replacement', 'FleetCare Motors', '2026-02-18', 58850.00, 7800.00, '2026-05-18', 'completed', '2026-02-19 06:12:06', '2026-02-19 06:12:06');

-- --------------------------------------------------------

--
-- Table structure for table `reservations`
--

CREATE TABLE `reservations` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `reservation_no` varchar(40) NOT NULL,
  `vehicle_id` bigint(20) UNSIGNED NOT NULL,
  `requester_id` bigint(20) UNSIGNED NOT NULL,
  `approver_id` bigint(20) UNSIGNED DEFAULT NULL,
  `assigned_driver_id` bigint(20) UNSIGNED DEFAULT NULL,
  `pickup_location_id` bigint(20) UNSIGNED DEFAULT NULL,
  `dropoff_location_id` bigint(20) UNSIGNED DEFAULT NULL,
  `purpose` varchar(255) NOT NULL,
  `destination` varchar(255) DEFAULT NULL,
  `start_at` datetime NOT NULL,
  `end_at` datetime NOT NULL,
  `actual_start_at` datetime DEFAULT NULL,
  `actual_end_at` datetime DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `assigned_at` datetime DEFAULT NULL,
  `passengers` tinyint(3) UNSIGNED DEFAULT NULL,
  `priority` enum('low','normal','high','urgent') NOT NULL DEFAULT 'normal',
  `status` enum('pending','approved','rejected','cancelled','active','completed','no_show') NOT NULL DEFAULT 'pending',
  `rejection_reason` varchar(255) DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `cancelled_at` datetime DEFAULT NULL
) ;

--
-- Dumping data for table `reservations`
--

INSERT INTO `reservations` (`id`, `reservation_no`, `vehicle_id`, `requester_id`, `approver_id`, `assigned_driver_id`, `pickup_location_id`, `dropoff_location_id`, `purpose`, `destination`, `start_at`, `end_at`, `actual_start_at`, `actual_end_at`, `approved_at`, `assigned_at`, `passengers`, `priority`, `status`, `rejection_reason`, `remarks`, `created_at`, `updated_at`, `cancelled_at`) VALUES
(1, 'RES-2026-0001', 1, 4, 2, NULL, 1, 3, 'Client site visit', 'Taguig City', '2026-02-24 08:00:00', '2026-02-24 12:00:00', '2026-02-24 08:05:00', '2026-02-24 12:15:00', NULL, NULL, 4, 'high', 'completed', NULL, 'Trip completed successfully', '2026-02-19 06:12:06', '2026-02-19 06:12:06', NULL),
(2, 'RES-2026-0002', 2, 5, 2, 28, 2, 1, 'Airport pickup', 'NAIA Terminal 3', '2026-02-26 09:00:00', '2026-02-26 14:00:00', NULL, NULL, '2026-02-25 09:00:00', '2026-02-20 13:50:27', 3, 'normal', 'approved', NULL, 'Driver assigned', '2026-02-19 06:12:06', '2026-02-20 05:50:27', NULL),
(3, 'RES-2026-0003', 3, 4, 1, 3, 3, 2, 'Branch stock transfer', 'Pasig Warehouse', '2026-02-27 07:00:00', '2026-02-27 11:00:00', NULL, NULL, '2026-02-19 15:21:36', '2026-02-19 15:21:40', 2, 'urgent', 'pending', NULL, 'Awaiting CAO approval', '2026-02-19 06:12:06', '2026-02-19 07:35:10', NULL),
(10, 'TR-2026-6A97D7', 1, 4, 2, 3, NULL, NULL, 'Site audit', NULL, '2026-03-01 09:00:00', '2026-03-01 11:00:00', NULL, NULL, '2026-02-19 15:14:53', '2026-02-19 15:14:53', NULL, 'normal', 'approved', NULL, NULL, '2026-02-19 07:14:53', '2026-02-19 07:14:53', NULL),
(11, 'TR-2026-C7F351', 1, 4, 2, NULL, NULL, NULL, 'Manager cancel test', NULL, '2026-03-02 09:00:00', '2026-03-02 11:00:00', NULL, NULL, '2026-02-19 15:24:46', NULL, NULL, 'normal', 'cancelled', 'Ops delay', NULL, '2026-02-19 07:24:45', '2026-02-19 07:24:46', '2026-02-19 15:24:46'),
(36, 'SEED-FULL-20260310-VH-0001', 1, 4, 2, 3, 1, 3, 'Full utilization trip for VH-0001', 'Metro Route', '2026-03-10 08:00:00', '2026-03-10 09:00:00', NULL, NULL, '2026-03-09 07:00:00', '2026-03-09 07:30:00', 2, 'high', 'approved', NULL, 'Seeded fully-booked vehicle day', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(37, 'SEED-FULL-20260310-VH-0003', 3, 4, 2, 27, 1, 3, 'Full utilization trip for VH-0003', 'Metro Route', '2026-03-10 10:40:00', '2026-03-10 11:40:00', NULL, NULL, '2026-03-09 07:00:00', '2026-03-09 07:30:00', 2, 'high', 'approved', NULL, 'Seeded fully-booked vehicle day', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(38, 'SEED-FULL-20260310-VH-0005', 17, 4, 2, 29, 1, 3, 'Full utilization trip for VH-0005', 'Metro Route', '2026-03-10 13:20:00', '2026-03-10 14:20:00', NULL, NULL, '2026-03-09 07:00:00', '2026-03-09 07:30:00', 2, 'high', 'approved', NULL, 'Seeded fully-booked vehicle day', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(39, 'SEED-FULL-20260310-VH-0002', 2, 5, 2, 26, 1, 3, 'Full utilization trip for VH-0002', 'Metro Route', '2026-03-10 09:20:00', '2026-03-10 10:20:00', NULL, NULL, '2026-03-09 07:00:00', '2026-03-09 07:30:00', 2, 'high', 'approved', NULL, 'Seeded fully-booked vehicle day', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(40, 'SEED-FULL-20260310-VH-0004', 16, 5, 2, 28, 1, 3, 'Full utilization trip for VH-0004', 'Metro Route', '2026-03-10 12:00:00', '2026-03-10 13:00:00', NULL, NULL, '2026-03-09 07:00:00', '2026-03-09 07:30:00', 2, 'high', 'approved', NULL, 'Seeded fully-booked vehicle day', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(41, 'SEED-FULL-20260311-VH-0001', 1, 4, 2, 3, 1, 3, 'Full utilization trip for VH-0001', 'Metro Route', '2026-03-11 08:00:00', '2026-03-11 09:00:00', NULL, NULL, '2026-03-10 07:00:00', '2026-03-10 07:30:00', 2, 'high', 'approved', NULL, 'Seeded fully-booked vehicle day', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(42, 'SEED-FULL-20260311-VH-0002', 2, 5, 2, 26, 1, 3, 'Full utilization trip for VH-0002', 'Metro Route', '2026-03-11 09:20:00', '2026-03-11 10:20:00', NULL, NULL, '2026-03-10 07:00:00', '2026-03-10 07:30:00', 2, 'high', 'approved', NULL, 'Seeded fully-booked vehicle day', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(43, 'SEED-FULL-20260311-VH-0003', 3, 4, 2, 27, 1, 3, 'Full utilization trip for VH-0003', 'Metro Route', '2026-03-11 10:40:00', '2026-03-11 11:40:00', NULL, NULL, '2026-03-10 07:00:00', '2026-03-10 07:30:00', 2, 'high', 'approved', NULL, 'Seeded fully-booked vehicle day', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(44, 'SEED-FULL-20260311-VH-0005', 17, 4, 2, 29, 1, 3, 'Full utilization trip for VH-0005', 'Metro Route', '2026-03-11 13:20:00', '2026-03-11 14:20:00', NULL, NULL, '2026-03-10 07:00:00', '2026-03-10 07:30:00', 2, 'high', 'approved', NULL, 'Seeded fully-booked vehicle day', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(45, 'SEED-FULL-20260311-VH-0004', 16, 5, 2, 28, 1, 3, 'Full utilization trip for VH-0004', 'Metro Route', '2026-03-11 12:00:00', '2026-03-11 13:00:00', NULL, NULL, '2026-03-10 07:00:00', '2026-03-10 07:30:00', 2, 'high', 'approved', NULL, 'Seeded fully-booked vehicle day', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(46, 'SEED-FULL-20260312-VH-0001', 1, 4, 2, 3, 1, 3, 'Full utilization trip for VH-0001', 'Metro Route', '2026-03-12 08:00:00', '2026-03-12 09:00:00', NULL, NULL, '2026-03-11 07:00:00', '2026-03-11 07:30:00', 2, 'high', 'approved', NULL, 'Seeded fully-booked vehicle day', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(47, 'SEED-FULL-20260312-VH-0002', 2, 5, 2, 26, 1, 3, 'Full utilization trip for VH-0002', 'Metro Route', '2026-03-12 09:20:00', '2026-03-12 10:20:00', NULL, NULL, '2026-03-11 07:00:00', '2026-03-11 07:30:00', 2, 'high', 'approved', NULL, 'Seeded fully-booked vehicle day', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(48, 'SEED-FULL-20260312-VH-0003', 3, 4, 2, 27, 1, 3, 'Full utilization trip for VH-0003', 'Metro Route', '2026-03-12 10:40:00', '2026-03-12 11:40:00', NULL, NULL, '2026-03-11 07:00:00', '2026-03-11 07:30:00', 2, 'high', 'approved', NULL, 'Seeded fully-booked vehicle day', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(49, 'SEED-FULL-20260312-VH-0004', 16, 5, 2, 28, 1, 3, 'Full utilization trip for VH-0004', 'Metro Route', '2026-03-12 12:00:00', '2026-03-12 13:00:00', NULL, NULL, '2026-03-11 07:00:00', '2026-03-11 07:30:00', 2, 'high', 'approved', NULL, 'Seeded fully-booked vehicle day', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(50, 'SEED-FULL-20260312-VH-0005', 17, 4, 2, 29, 1, 3, 'Full utilization trip for VH-0005', 'Metro Route', '2026-03-12 13:20:00', '2026-03-12 14:20:00', NULL, NULL, '2026-03-11 07:00:00', '2026-03-11 07:30:00', 2, 'high', 'approved', NULL, 'Seeded fully-booked vehicle day', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(51, 'SEED-FULL-20260313-VH-0001', 1, 4, 2, 3, 1, 3, 'Full utilization trip for VH-0001', 'Metro Route', '2026-03-13 08:00:00', '2026-03-13 09:00:00', NULL, NULL, '2026-03-12 07:00:00', '2026-03-12 07:30:00', 2, 'high', 'approved', NULL, 'Seeded fully-booked vehicle day', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(52, 'SEED-FULL-20260313-VH-0003', 3, 4, 2, 27, 1, 3, 'Full utilization trip for VH-0003', 'Metro Route', '2026-03-13 10:40:00', '2026-03-13 11:40:00', NULL, NULL, '2026-03-12 07:00:00', '2026-03-12 07:30:00', 2, 'high', 'approved', NULL, 'Seeded fully-booked vehicle day', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(53, 'SEED-FULL-20260313-VH-0005', 17, 4, 2, 29, 1, 3, 'Full utilization trip for VH-0005', 'Metro Route', '2026-03-13 13:20:00', '2026-03-13 14:20:00', NULL, NULL, '2026-03-12 07:00:00', '2026-03-12 07:30:00', 2, 'high', 'approved', NULL, 'Seeded fully-booked vehicle day', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(54, 'SEED-FULL-20260313-VH-0002', 2, 5, 2, 26, 1, 3, 'Full utilization trip for VH-0002', 'Metro Route', '2026-03-13 09:20:00', '2026-03-13 10:20:00', NULL, NULL, '2026-03-12 07:00:00', '2026-03-12 07:30:00', 2, 'high', 'approved', NULL, 'Seeded fully-booked vehicle day', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(55, 'SEED-FULL-20260313-VH-0004', 16, 5, 2, 28, 1, 3, 'Full utilization trip for VH-0004', 'Metro Route', '2026-03-13 12:00:00', '2026-03-13 13:00:00', NULL, NULL, '2026-03-12 07:00:00', '2026-03-12 07:30:00', 2, 'high', 'approved', NULL, 'Seeded fully-booked vehicle day', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(56, 'SEED-FULL-20260314-VH-0001', 1, 4, 2, 3, 1, 3, 'Full utilization trip for VH-0001', 'Metro Route', '2026-03-14 08:00:00', '2026-03-14 09:00:00', NULL, NULL, '2026-03-13 07:00:00', '2026-03-13 07:30:00', 2, 'high', 'approved', NULL, 'Seeded fully-booked vehicle day', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(57, 'SEED-FULL-20260314-VH-0003', 3, 4, 2, 27, 1, 3, 'Full utilization trip for VH-0003', 'Metro Route', '2026-03-14 10:40:00', '2026-03-14 11:40:00', NULL, NULL, '2026-03-13 07:00:00', '2026-03-13 07:30:00', 2, 'high', 'approved', NULL, 'Seeded fully-booked vehicle day', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(58, 'SEED-FULL-20260314-VH-0005', 17, 4, 2, 29, 1, 3, 'Full utilization trip for VH-0005', 'Metro Route', '2026-03-14 13:20:00', '2026-03-14 14:20:00', NULL, NULL, '2026-03-13 07:00:00', '2026-03-13 07:30:00', 2, 'high', 'approved', NULL, 'Seeded fully-booked vehicle day', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(59, 'SEED-FULL-20260314-VH-0002', 2, 5, 2, 26, 1, 3, 'Full utilization trip for VH-0002', 'Metro Route', '2026-03-14 09:20:00', '2026-03-14 10:20:00', NULL, NULL, '2026-03-13 07:00:00', '2026-03-13 07:30:00', 2, 'high', 'approved', NULL, 'Seeded fully-booked vehicle day', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(60, 'SEED-FULL-20260314-VH-0004', 16, 5, 2, 28, 1, 3, 'Full utilization trip for VH-0004', 'Metro Route', '2026-03-14 12:00:00', '2026-03-14 13:00:00', NULL, NULL, '2026-03-13 07:00:00', '2026-03-13 07:30:00', 2, 'high', 'approved', NULL, 'Seeded fully-booked vehicle day', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(67, 'SEED-REQ-0001', 1, 4, 2, 3, 1, 2, 'Seed request #1', 'Destination #1', '2026-03-01 08:00:00', '2026-03-01 09:00:00', NULL, NULL, '2026-02-28 07:00:00', '2026-02-28 07:30:00', 1, 'low', 'approved', NULL, 'Bulk seeded request 1', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(68, 'SEED-REQ-0006', 1, 5, 2, 3, 1, 2, 'Seed request #6', 'Destination #6', '2026-03-02 08:00:00', '2026-03-02 09:00:00', NULL, NULL, '2026-03-01 07:00:00', '2026-03-01 07:30:00', 6, 'normal', 'approved', NULL, 'Bulk seeded request 6', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(69, 'SEED-REQ-0011', 1, 4, 2, 3, 1, 2, 'Seed request #11', 'Destination #11', '2026-03-03 08:00:00', '2026-03-03 09:00:00', NULL, NULL, '2026-03-02 07:00:00', '2026-03-02 07:30:00', 5, 'high', 'approved', NULL, 'Bulk seeded request 11', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(70, 'SEED-REQ-0016', 1, 5, 2, 3, 1, 2, 'Seed request #16', 'Destination #4', '2026-03-04 08:00:00', '2026-03-04 09:00:00', NULL, NULL, '2026-03-03 07:00:00', '2026-03-03 07:30:00', 4, 'urgent', 'approved', NULL, 'Bulk seeded request 16', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(71, 'SEED-REQ-0021', 1, 4, 2, 3, 1, 2, 'Seed request #21', 'Destination #9', '2026-03-05 08:00:00', '2026-03-05 09:00:00', NULL, NULL, '2026-03-04 07:00:00', '2026-03-04 07:30:00', 3, 'low', 'approved', NULL, 'Bulk seeded request 21', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(72, 'SEED-REQ-0002', 2, 5, 2, 26, 1, 2, 'Seed request #2', 'Destination #2', '2026-03-01 09:30:00', '2026-03-01 10:30:00', NULL, NULL, '2026-02-28 07:00:00', '2026-02-28 07:30:00', 2, 'normal', 'completed', NULL, 'Bulk seeded request 2', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(73, 'SEED-REQ-0007', 2, 4, 2, 26, 1, 2, 'Seed request #7', 'Destination #7', '2026-03-02 09:30:00', '2026-03-02 10:30:00', NULL, NULL, '2026-03-01 07:00:00', '2026-03-01 07:30:00', 1, 'high', 'completed', NULL, 'Bulk seeded request 7', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(74, 'SEED-REQ-0012', 2, 5, 2, 26, 1, 2, 'Seed request #12', 'Destination #12', '2026-03-03 09:30:00', '2026-03-03 10:30:00', NULL, NULL, '2026-03-02 07:00:00', '2026-03-02 07:30:00', 6, 'urgent', 'completed', NULL, 'Bulk seeded request 12', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(75, 'SEED-REQ-0017', 2, 4, 2, 26, 1, 2, 'Seed request #17', 'Destination #5', '2026-03-04 09:30:00', '2026-03-04 10:30:00', NULL, NULL, '2026-03-03 07:00:00', '2026-03-03 07:30:00', 5, 'low', 'completed', NULL, 'Bulk seeded request 17', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(76, 'SEED-REQ-0022', 2, 5, 2, 26, 1, 2, 'Seed request #22', 'Destination #10', '2026-03-05 09:30:00', '2026-03-05 10:30:00', NULL, NULL, '2026-03-04 07:00:00', '2026-03-04 07:30:00', 4, 'normal', 'completed', NULL, 'Bulk seeded request 22', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(77, 'SEED-REQ-0003', 3, 4, NULL, NULL, 1, 2, 'Seed request #3', 'Destination #3', '2026-03-01 11:00:00', '2026-03-01 12:00:00', NULL, NULL, NULL, NULL, 3, 'high', 'rejected', 'Insufficient details', 'Bulk seeded request 3', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(78, 'SEED-REQ-0008', 3, 5, NULL, NULL, 1, 2, 'Seed request #8', 'Destination #8', '2026-03-02 11:00:00', '2026-03-02 12:00:00', NULL, NULL, NULL, NULL, 2, 'urgent', 'rejected', 'Insufficient details', 'Bulk seeded request 8', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(79, 'SEED-REQ-0013', 3, 4, NULL, NULL, 1, 2, 'Seed request #13', 'Destination #1', '2026-03-03 11:00:00', '2026-03-03 12:00:00', NULL, NULL, NULL, NULL, 1, 'low', 'rejected', 'Insufficient details', 'Bulk seeded request 13', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(80, 'SEED-REQ-0018', 3, 5, NULL, NULL, 1, 2, 'Seed request #18', 'Destination #6', '2026-03-04 11:00:00', '2026-03-04 12:00:00', NULL, NULL, NULL, NULL, 6, 'normal', 'rejected', 'Insufficient details', 'Bulk seeded request 18', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(81, 'SEED-REQ-0023', 3, 4, NULL, NULL, 1, 2, 'Seed request #23', 'Destination #11', '2026-03-05 11:00:00', '2026-03-05 12:00:00', NULL, NULL, NULL, NULL, 5, 'high', 'rejected', 'Insufficient details', 'Bulk seeded request 23', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(82, 'SEED-REQ-0004', 16, 5, NULL, NULL, 1, 2, 'Seed request #4', 'Destination #4', '2026-03-01 12:30:00', '2026-03-01 13:30:00', NULL, NULL, NULL, NULL, 4, 'urgent', 'cancelled', NULL, 'Bulk seeded request 4', '2026-02-19 08:43:54', '2026-02-19 08:43:54', '2026-03-01 06:30:00'),
(83, 'SEED-REQ-0009', 16, 4, NULL, NULL, 1, 2, 'Seed request #9', 'Destination #9', '2026-03-02 12:30:00', '2026-03-02 13:30:00', NULL, NULL, NULL, NULL, 3, 'low', 'cancelled', NULL, 'Bulk seeded request 9', '2026-02-19 08:43:54', '2026-02-19 08:43:54', '2026-03-02 06:30:00'),
(84, 'SEED-REQ-0014', 16, 5, NULL, NULL, 1, 2, 'Seed request #14', 'Destination #2', '2026-03-03 12:30:00', '2026-03-03 13:30:00', NULL, NULL, NULL, NULL, 2, 'normal', 'cancelled', NULL, 'Bulk seeded request 14', '2026-02-19 08:43:54', '2026-02-19 08:43:54', '2026-03-03 06:30:00'),
(85, 'SEED-REQ-0019', 16, 4, NULL, NULL, 1, 2, 'Seed request #19', 'Destination #7', '2026-03-04 12:30:00', '2026-03-04 13:30:00', NULL, NULL, NULL, NULL, 1, 'high', 'cancelled', NULL, 'Bulk seeded request 19', '2026-02-19 08:43:54', '2026-02-19 08:43:54', '2026-03-04 06:30:00'),
(86, 'SEED-REQ-0024', 16, 5, NULL, NULL, 1, 2, 'Seed request #24', 'Destination #12', '2026-03-05 12:30:00', '2026-03-05 13:30:00', NULL, NULL, NULL, NULL, 6, 'urgent', 'cancelled', NULL, 'Bulk seeded request 24', '2026-02-19 08:43:54', '2026-02-19 08:43:54', '2026-03-05 06:30:00'),
(87, 'SEED-REQ-0005', 17, 4, NULL, NULL, 1, 2, 'Seed request #5', 'Destination #5', '2026-03-01 14:00:00', '2026-03-01 15:00:00', NULL, NULL, NULL, NULL, 5, 'low', 'pending', NULL, 'Bulk seeded request 5', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(88, 'SEED-REQ-0010', 17, 5, NULL, NULL, 1, 2, 'Seed request #10', 'Destination #10', '2026-03-02 14:00:00', '2026-03-02 15:00:00', NULL, NULL, NULL, NULL, 4, 'normal', 'pending', NULL, 'Bulk seeded request 10', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(89, 'SEED-REQ-0015', 17, 4, NULL, NULL, 1, 2, 'Seed request #15', 'Destination #3', '2026-03-03 14:00:00', '2026-03-03 15:00:00', NULL, NULL, NULL, NULL, 3, 'high', 'pending', NULL, 'Bulk seeded request 15', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(90, 'SEED-REQ-0020', 17, 5, NULL, NULL, 1, 2, 'Seed request #20', 'Destination #8', '2026-03-04 14:00:00', '2026-03-04 15:00:00', NULL, NULL, NULL, NULL, 2, 'urgent', 'pending', NULL, 'Bulk seeded request 20', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(91, 'SEED-REQ-0025', 17, 4, NULL, NULL, 1, 2, 'Seed request #25', 'Destination #1', '2026-03-05 14:00:00', '2026-03-05 15:00:00', NULL, NULL, NULL, NULL, 1, 'low', 'pending', NULL, 'Bulk seeded request 25', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(92, 'SEED-REQ-0026', 1, 5, 2, 3, 1, 2, 'Seed request #26', 'Destination #2', '2026-03-06 08:00:00', '2026-03-06 09:00:00', NULL, NULL, '2026-03-05 07:00:00', '2026-03-05 07:30:00', 2, 'normal', 'approved', NULL, 'Bulk seeded request 26', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(93, 'SEED-REQ-0031', 1, 4, 2, 3, 1, 2, 'Seed request #31', 'Destination #7', '2026-03-07 08:00:00', '2026-03-07 09:00:00', NULL, NULL, '2026-03-06 07:00:00', '2026-03-06 07:30:00', 1, 'high', 'approved', NULL, 'Bulk seeded request 31', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(94, 'SEED-REQ-0036', 1, 5, 2, 3, 1, 2, 'Seed request #36', 'Destination #12', '2026-03-08 08:00:00', '2026-03-08 09:00:00', NULL, NULL, '2026-03-07 07:00:00', '2026-03-07 07:30:00', 6, 'urgent', 'approved', NULL, 'Bulk seeded request 36', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(95, 'SEED-REQ-0041', 1, 4, 2, 3, 1, 2, 'Seed request #41', 'Destination #5', '2026-03-09 08:00:00', '2026-03-09 09:00:00', NULL, NULL, '2026-03-08 07:00:00', '2026-03-08 07:30:00', 5, 'low', 'approved', NULL, 'Bulk seeded request 41', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(96, 'SEED-REQ-0046', 1, 5, 2, 3, 1, 2, 'Seed request #46', 'Destination #10', '2026-03-10 08:00:00', '2026-03-10 09:00:00', NULL, NULL, '2026-03-09 07:00:00', '2026-03-09 07:30:00', 4, 'normal', 'approved', NULL, 'Bulk seeded request 46', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(97, 'SEED-REQ-0027', 2, 4, 2, 26, 1, 2, 'Seed request #27', 'Destination #3', '2026-03-06 09:30:00', '2026-03-06 10:30:00', NULL, NULL, '2026-03-05 07:00:00', '2026-03-05 07:30:00', 3, 'high', 'completed', NULL, 'Bulk seeded request 27', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(98, 'SEED-REQ-0032', 2, 5, 2, 26, 1, 2, 'Seed request #32', 'Destination #8', '2026-03-07 09:30:00', '2026-03-07 10:30:00', NULL, NULL, '2026-03-06 07:00:00', '2026-03-06 07:30:00', 2, 'urgent', 'completed', NULL, 'Bulk seeded request 32', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(99, 'SEED-REQ-0037', 2, 4, 2, 26, 1, 2, 'Seed request #37', 'Destination #1', '2026-03-08 09:30:00', '2026-03-08 10:30:00', NULL, NULL, '2026-03-07 07:00:00', '2026-03-07 07:30:00', 1, 'low', 'completed', NULL, 'Bulk seeded request 37', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(100, 'SEED-REQ-0042', 2, 5, 2, 26, 1, 2, 'Seed request #42', 'Destination #6', '2026-03-09 09:30:00', '2026-03-09 10:30:00', NULL, NULL, '2026-03-08 07:00:00', '2026-03-08 07:30:00', 6, 'normal', 'completed', NULL, 'Bulk seeded request 42', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(101, 'SEED-REQ-0047', 2, 4, 2, 26, 1, 2, 'Seed request #47', 'Destination #11', '2026-03-10 09:30:00', '2026-03-10 10:30:00', NULL, NULL, '2026-03-09 07:00:00', '2026-03-09 07:30:00', 5, 'high', 'completed', NULL, 'Bulk seeded request 47', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(102, 'SEED-REQ-0028', 3, 5, NULL, NULL, 1, 2, 'Seed request #28', 'Destination #4', '2026-03-06 11:00:00', '2026-03-06 12:00:00', NULL, NULL, NULL, NULL, 4, 'urgent', 'rejected', 'Insufficient details', 'Bulk seeded request 28', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(103, 'SEED-REQ-0033', 3, 4, NULL, NULL, 1, 2, 'Seed request #33', 'Destination #9', '2026-03-07 11:00:00', '2026-03-07 12:00:00', NULL, NULL, NULL, NULL, 3, 'low', 'rejected', 'Insufficient details', 'Bulk seeded request 33', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(104, 'SEED-REQ-0038', 3, 5, NULL, NULL, 1, 2, 'Seed request #38', 'Destination #2', '2026-03-08 11:00:00', '2026-03-08 12:00:00', NULL, NULL, NULL, NULL, 2, 'normal', 'rejected', 'Insufficient details', 'Bulk seeded request 38', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(105, 'SEED-REQ-0043', 3, 4, NULL, NULL, 1, 2, 'Seed request #43', 'Destination #7', '2026-03-09 11:00:00', '2026-03-09 12:00:00', NULL, NULL, NULL, NULL, 1, 'high', 'rejected', 'Insufficient details', 'Bulk seeded request 43', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(106, 'SEED-REQ-0048', 3, 5, NULL, NULL, 1, 2, 'Seed request #48', 'Destination #12', '2026-03-10 11:00:00', '2026-03-10 12:00:00', NULL, NULL, NULL, NULL, 6, 'urgent', 'rejected', 'Insufficient details', 'Bulk seeded request 48', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(107, 'SEED-REQ-0029', 16, 4, NULL, NULL, 1, 2, 'Seed request #29', 'Destination #5', '2026-03-06 12:30:00', '2026-03-06 13:30:00', NULL, NULL, NULL, NULL, 5, 'low', 'cancelled', NULL, 'Bulk seeded request 29', '2026-02-19 08:43:54', '2026-02-19 08:43:54', '2026-03-06 06:30:00'),
(108, 'SEED-REQ-0034', 16, 5, NULL, NULL, 1, 2, 'Seed request #34', 'Destination #10', '2026-03-07 12:30:00', '2026-03-07 13:30:00', NULL, NULL, NULL, NULL, 4, 'normal', 'cancelled', NULL, 'Bulk seeded request 34', '2026-02-19 08:43:54', '2026-02-19 08:43:54', '2026-03-07 06:30:00'),
(109, 'SEED-REQ-0039', 16, 4, NULL, NULL, 1, 2, 'Seed request #39', 'Destination #3', '2026-03-08 12:30:00', '2026-03-08 13:30:00', NULL, NULL, NULL, NULL, 3, 'high', 'cancelled', NULL, 'Bulk seeded request 39', '2026-02-19 08:43:54', '2026-02-19 08:43:54', '2026-03-08 06:30:00'),
(110, 'SEED-REQ-0044', 16, 5, NULL, NULL, 1, 2, 'Seed request #44', 'Destination #8', '2026-03-09 12:30:00', '2026-03-09 13:30:00', NULL, NULL, NULL, NULL, 2, 'urgent', 'cancelled', NULL, 'Bulk seeded request 44', '2026-02-19 08:43:54', '2026-02-19 08:43:54', '2026-03-09 06:30:00'),
(111, 'SEED-REQ-0049', 16, 4, NULL, NULL, 1, 2, 'Seed request #49', 'Destination #1', '2026-03-10 12:30:00', '2026-03-10 13:30:00', NULL, NULL, NULL, NULL, 1, 'low', 'cancelled', NULL, 'Bulk seeded request 49', '2026-02-19 08:43:54', '2026-02-19 08:43:54', '2026-03-10 06:30:00'),
(112, 'SEED-REQ-0030', 17, 5, NULL, NULL, 1, 2, 'Seed request #30', 'Destination #6', '2026-03-06 14:00:00', '2026-03-06 15:00:00', NULL, NULL, NULL, NULL, 6, 'normal', 'pending', NULL, 'Bulk seeded request 30', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(113, 'SEED-REQ-0035', 17, 4, NULL, NULL, 1, 2, 'Seed request #35', 'Destination #11', '2026-03-07 14:00:00', '2026-03-07 15:00:00', NULL, NULL, NULL, NULL, 5, 'high', 'pending', NULL, 'Bulk seeded request 35', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(114, 'SEED-REQ-0040', 17, 5, NULL, NULL, 1, 2, 'Seed request #40', 'Destination #4', '2026-03-08 14:00:00', '2026-03-08 15:00:00', NULL, NULL, NULL, NULL, 4, 'urgent', 'pending', NULL, 'Bulk seeded request 40', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(115, 'SEED-REQ-0045', 17, 4, NULL, NULL, 1, 2, 'Seed request #45', 'Destination #9', '2026-03-09 14:00:00', '2026-03-09 15:00:00', NULL, NULL, NULL, NULL, 3, 'low', 'pending', NULL, 'Bulk seeded request 45', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(116, 'SEED-REQ-0050', 17, 5, NULL, NULL, 1, 2, 'Seed request #50', 'Destination #2', '2026-03-10 14:00:00', '2026-03-10 15:00:00', NULL, NULL, NULL, NULL, 2, 'normal', 'pending', NULL, 'Bulk seeded request 50', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(117, 'SEED-REQ-0051', 1, 4, 2, 3, 1, 2, 'Seed request #51', 'Destination #3', '2026-03-11 08:00:00', '2026-03-11 09:00:00', NULL, NULL, '2026-03-10 07:00:00', '2026-03-10 07:30:00', 3, 'high', 'approved', NULL, 'Bulk seeded request 51', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(118, 'SEED-REQ-0056', 1, 5, 2, 3, 1, 2, 'Seed request #56', 'Destination #8', '2026-03-12 08:00:00', '2026-03-12 09:00:00', NULL, NULL, '2026-03-11 07:00:00', '2026-03-11 07:30:00', 2, 'urgent', 'approved', NULL, 'Bulk seeded request 56', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(119, 'SEED-REQ-0061', 1, 4, 2, 3, 1, 2, 'Seed request #61', 'Destination #1', '2026-03-13 08:00:00', '2026-03-13 09:00:00', NULL, NULL, '2026-03-12 07:00:00', '2026-03-12 07:30:00', 1, 'low', 'approved', NULL, 'Bulk seeded request 61', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(120, 'SEED-REQ-0066', 1, 5, 2, 3, 1, 2, 'Seed request #66', 'Destination #6', '2026-03-14 08:00:00', '2026-03-14 09:00:00', NULL, NULL, '2026-03-13 07:00:00', '2026-03-13 07:30:00', 6, 'normal', 'approved', NULL, 'Bulk seeded request 66', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(121, 'SEED-REQ-0071', 1, 4, 2, 3, 1, 2, 'Seed request #71', 'Destination #11', '2026-03-15 08:00:00', '2026-03-15 09:00:00', NULL, NULL, '2026-03-14 07:00:00', '2026-03-14 07:30:00', 5, 'high', 'approved', NULL, 'Bulk seeded request 71', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(122, 'SEED-REQ-0052', 2, 5, 2, 26, 1, 2, 'Seed request #52', 'Destination #4', '2026-03-11 09:30:00', '2026-03-11 10:30:00', NULL, NULL, '2026-03-10 07:00:00', '2026-03-10 07:30:00', 4, 'urgent', 'completed', NULL, 'Bulk seeded request 52', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(123, 'SEED-REQ-0057', 2, 4, 2, 26, 1, 2, 'Seed request #57', 'Destination #9', '2026-03-12 09:30:00', '2026-03-12 10:30:00', NULL, NULL, '2026-03-11 07:00:00', '2026-03-11 07:30:00', 3, 'low', 'completed', NULL, 'Bulk seeded request 57', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(124, 'SEED-REQ-0062', 2, 5, 2, 26, 1, 2, 'Seed request #62', 'Destination #2', '2026-03-13 09:30:00', '2026-03-13 10:30:00', NULL, NULL, '2026-03-12 07:00:00', '2026-03-12 07:30:00', 2, 'normal', 'completed', NULL, 'Bulk seeded request 62', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(125, 'SEED-REQ-0067', 2, 4, 2, 26, 1, 2, 'Seed request #67', 'Destination #7', '2026-03-14 09:30:00', '2026-03-14 10:30:00', NULL, NULL, '2026-03-13 07:00:00', '2026-03-13 07:30:00', 1, 'high', 'completed', NULL, 'Bulk seeded request 67', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(126, 'SEED-REQ-0072', 2, 5, 2, 26, 1, 2, 'Seed request #72', 'Destination #12', '2026-03-15 09:30:00', '2026-03-15 10:30:00', NULL, NULL, '2026-03-14 07:00:00', '2026-03-14 07:30:00', 6, 'urgent', 'completed', NULL, 'Bulk seeded request 72', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(127, 'SEED-REQ-0053', 3, 4, NULL, NULL, 1, 2, 'Seed request #53', 'Destination #5', '2026-03-11 11:00:00', '2026-03-11 12:00:00', NULL, NULL, NULL, NULL, 5, 'low', 'rejected', 'Insufficient details', 'Bulk seeded request 53', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(128, 'SEED-REQ-0058', 3, 5, NULL, NULL, 1, 2, 'Seed request #58', 'Destination #10', '2026-03-12 11:00:00', '2026-03-12 12:00:00', NULL, NULL, NULL, NULL, 4, 'normal', 'rejected', 'Insufficient details', 'Bulk seeded request 58', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(129, 'SEED-REQ-0063', 3, 4, NULL, NULL, 1, 2, 'Seed request #63', 'Destination #3', '2026-03-13 11:00:00', '2026-03-13 12:00:00', NULL, NULL, NULL, NULL, 3, 'high', 'rejected', 'Insufficient details', 'Bulk seeded request 63', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(130, 'SEED-REQ-0068', 3, 5, NULL, NULL, 1, 2, 'Seed request #68', 'Destination #8', '2026-03-14 11:00:00', '2026-03-14 12:00:00', NULL, NULL, NULL, NULL, 2, 'urgent', 'rejected', 'Insufficient details', 'Bulk seeded request 68', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(131, 'SEED-REQ-0073', 3, 4, NULL, NULL, 1, 2, 'Seed request #73', 'Destination #1', '2026-03-15 11:00:00', '2026-03-15 12:00:00', NULL, NULL, NULL, NULL, 1, 'low', 'rejected', 'Insufficient details', 'Bulk seeded request 73', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(132, 'SEED-REQ-0054', 16, 5, NULL, NULL, 1, 2, 'Seed request #54', 'Destination #6', '2026-03-11 12:30:00', '2026-03-11 13:30:00', NULL, NULL, NULL, NULL, 6, 'normal', 'cancelled', NULL, 'Bulk seeded request 54', '2026-02-19 08:43:54', '2026-02-19 08:43:54', '2026-03-11 06:30:00'),
(133, 'SEED-REQ-0059', 16, 4, NULL, NULL, 1, 2, 'Seed request #59', 'Destination #11', '2026-03-12 12:30:00', '2026-03-12 13:30:00', NULL, NULL, NULL, NULL, 5, 'high', 'cancelled', NULL, 'Bulk seeded request 59', '2026-02-19 08:43:54', '2026-02-19 08:43:54', '2026-03-12 06:30:00'),
(134, 'SEED-REQ-0064', 16, 5, NULL, NULL, 1, 2, 'Seed request #64', 'Destination #4', '2026-03-13 12:30:00', '2026-03-13 13:30:00', NULL, NULL, NULL, NULL, 4, 'urgent', 'cancelled', NULL, 'Bulk seeded request 64', '2026-02-19 08:43:54', '2026-02-19 08:43:54', '2026-03-13 06:30:00'),
(135, 'SEED-REQ-0069', 16, 4, NULL, NULL, 1, 2, 'Seed request #69', 'Destination #9', '2026-03-14 12:30:00', '2026-03-14 13:30:00', NULL, NULL, NULL, NULL, 3, 'low', 'cancelled', NULL, 'Bulk seeded request 69', '2026-02-19 08:43:54', '2026-02-19 08:43:54', '2026-03-14 06:30:00'),
(136, 'SEED-REQ-0074', 16, 5, NULL, NULL, 1, 2, 'Seed request #74', 'Destination #2', '2026-03-15 12:30:00', '2026-03-15 13:30:00', NULL, NULL, NULL, NULL, 2, 'normal', 'cancelled', NULL, 'Bulk seeded request 74', '2026-02-19 08:43:54', '2026-02-19 08:43:54', '2026-03-15 06:30:00'),
(137, 'SEED-REQ-0055', 17, 4, NULL, NULL, 1, 2, 'Seed request #55', 'Destination #7', '2026-03-11 14:00:00', '2026-03-11 15:00:00', NULL, NULL, NULL, NULL, 1, 'high', 'pending', NULL, 'Bulk seeded request 55', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(138, 'SEED-REQ-0060', 17, 5, NULL, NULL, 1, 2, 'Seed request #60', 'Destination #12', '2026-03-12 14:00:00', '2026-03-12 15:00:00', NULL, NULL, NULL, NULL, 6, 'urgent', 'pending', NULL, 'Bulk seeded request 60', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(139, 'SEED-REQ-0065', 17, 4, NULL, NULL, 1, 2, 'Seed request #65', 'Destination #5', '2026-03-13 14:00:00', '2026-03-13 15:00:00', NULL, NULL, NULL, NULL, 5, 'low', 'pending', NULL, 'Bulk seeded request 65', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(140, 'SEED-REQ-0070', 17, 5, NULL, NULL, 1, 2, 'Seed request #70', 'Destination #10', '2026-03-14 14:00:00', '2026-03-14 15:00:00', NULL, NULL, NULL, NULL, 4, 'normal', 'pending', NULL, 'Bulk seeded request 70', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(141, 'SEED-REQ-0075', 17, 4, NULL, NULL, 1, 2, 'Seed request #75', 'Destination #3', '2026-03-15 14:00:00', '2026-03-15 15:00:00', NULL, NULL, NULL, NULL, 3, 'high', 'pending', NULL, 'Bulk seeded request 75', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(142, 'SEED-REQ-0076', 1, 5, 2, 3, 1, 2, 'Seed request #76', 'Destination #4', '2026-03-16 08:00:00', '2026-03-16 09:00:00', NULL, NULL, '2026-03-15 07:00:00', '2026-03-15 07:30:00', 4, 'urgent', 'approved', NULL, 'Bulk seeded request 76', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(143, 'SEED-REQ-0081', 1, 4, 2, 3, 1, 2, 'Seed request #81', 'Destination #9', '2026-03-17 08:00:00', '2026-03-17 09:00:00', NULL, NULL, '2026-03-16 07:00:00', '2026-03-16 07:30:00', 3, 'low', 'approved', NULL, 'Bulk seeded request 81', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(144, 'SEED-REQ-0086', 1, 5, 2, 3, 1, 2, 'Seed request #86', 'Destination #2', '2026-03-18 08:00:00', '2026-03-18 09:00:00', NULL, NULL, '2026-03-17 07:00:00', '2026-03-17 07:30:00', 2, 'normal', 'approved', NULL, 'Bulk seeded request 86', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(145, 'SEED-REQ-0091', 1, 4, 2, 3, 1, 2, 'Seed request #91', 'Destination #7', '2026-03-19 08:00:00', '2026-03-19 09:00:00', NULL, NULL, '2026-03-18 07:00:00', '2026-03-18 07:30:00', 1, 'high', 'approved', NULL, 'Bulk seeded request 91', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(146, 'SEED-REQ-0096', 1, 5, 2, 3, 1, 2, 'Seed request #96', 'Destination #12', '2026-03-20 08:00:00', '2026-03-20 09:00:00', NULL, NULL, '2026-03-19 07:00:00', '2026-03-19 07:30:00', 6, 'urgent', 'approved', NULL, 'Bulk seeded request 96', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(147, 'SEED-REQ-0077', 2, 4, 2, 26, 1, 2, 'Seed request #77', 'Destination #5', '2026-03-16 09:30:00', '2026-03-16 10:30:00', NULL, NULL, '2026-03-15 07:00:00', '2026-03-15 07:30:00', 5, 'low', 'completed', NULL, 'Bulk seeded request 77', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(148, 'SEED-REQ-0082', 2, 5, 2, 26, 1, 2, 'Seed request #82', 'Destination #10', '2026-03-17 09:30:00', '2026-03-17 10:30:00', NULL, NULL, '2026-03-16 07:00:00', '2026-03-16 07:30:00', 4, 'normal', 'completed', NULL, 'Bulk seeded request 82', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(149, 'SEED-REQ-0087', 2, 4, 2, 26, 1, 2, 'Seed request #87', 'Destination #3', '2026-03-18 09:30:00', '2026-03-18 10:30:00', NULL, NULL, '2026-03-17 07:00:00', '2026-03-17 07:30:00', 3, 'high', 'completed', NULL, 'Bulk seeded request 87', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(150, 'SEED-REQ-0092', 2, 5, 2, 26, 1, 2, 'Seed request #92', 'Destination #8', '2026-03-19 09:30:00', '2026-03-19 10:30:00', NULL, NULL, '2026-03-18 07:00:00', '2026-03-18 07:30:00', 2, 'urgent', 'completed', NULL, 'Bulk seeded request 92', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(151, 'SEED-REQ-0097', 2, 4, 2, 26, 1, 2, 'Seed request #97', 'Destination #1', '2026-03-20 09:30:00', '2026-03-20 10:30:00', NULL, NULL, '2026-03-19 07:00:00', '2026-03-19 07:30:00', 1, 'low', 'completed', NULL, 'Bulk seeded request 97', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(152, 'SEED-REQ-0078', 3, 5, NULL, NULL, 1, 2, 'Seed request #78', 'Destination #6', '2026-03-16 11:00:00', '2026-03-16 12:00:00', NULL, NULL, NULL, NULL, 6, 'normal', 'rejected', 'Insufficient details', 'Bulk seeded request 78', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(153, 'SEED-REQ-0083', 3, 4, NULL, NULL, 1, 2, 'Seed request #83', 'Destination #11', '2026-03-17 11:00:00', '2026-03-17 12:00:00', NULL, NULL, NULL, NULL, 5, 'high', 'rejected', 'Insufficient details', 'Bulk seeded request 83', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(154, 'SEED-REQ-0088', 3, 5, NULL, NULL, 1, 2, 'Seed request #88', 'Destination #4', '2026-03-18 11:00:00', '2026-03-18 12:00:00', NULL, NULL, NULL, NULL, 4, 'urgent', 'rejected', 'Insufficient details', 'Bulk seeded request 88', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(155, 'SEED-REQ-0093', 3, 4, NULL, NULL, 1, 2, 'Seed request #93', 'Destination #9', '2026-03-19 11:00:00', '2026-03-19 12:00:00', NULL, NULL, NULL, NULL, 3, 'low', 'rejected', 'Insufficient details', 'Bulk seeded request 93', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(156, 'SEED-REQ-0098', 3, 5, NULL, NULL, 1, 2, 'Seed request #98', 'Destination #2', '2026-03-20 11:00:00', '2026-03-20 12:00:00', NULL, NULL, NULL, NULL, 2, 'normal', 'rejected', 'Insufficient details', 'Bulk seeded request 98', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(157, 'SEED-REQ-0079', 16, 4, NULL, NULL, 1, 2, 'Seed request #79', 'Destination #7', '2026-03-16 12:30:00', '2026-03-16 13:30:00', NULL, NULL, NULL, NULL, 1, 'high', 'cancelled', NULL, 'Bulk seeded request 79', '2026-02-19 08:43:54', '2026-02-19 08:43:54', '2026-03-16 06:30:00'),
(158, 'SEED-REQ-0084', 16, 5, NULL, NULL, 1, 2, 'Seed request #84', 'Destination #12', '2026-03-17 12:30:00', '2026-03-17 13:30:00', NULL, NULL, NULL, NULL, 6, 'urgent', 'cancelled', NULL, 'Bulk seeded request 84', '2026-02-19 08:43:54', '2026-02-19 08:43:54', '2026-03-17 06:30:00'),
(159, 'SEED-REQ-0089', 16, 4, NULL, NULL, 1, 2, 'Seed request #89', 'Destination #5', '2026-03-18 12:30:00', '2026-03-18 13:30:00', NULL, NULL, NULL, NULL, 5, 'low', 'cancelled', NULL, 'Bulk seeded request 89', '2026-02-19 08:43:54', '2026-02-19 08:43:54', '2026-03-18 06:30:00'),
(160, 'SEED-REQ-0094', 16, 5, NULL, NULL, 1, 2, 'Seed request #94', 'Destination #10', '2026-03-19 12:30:00', '2026-03-19 13:30:00', NULL, NULL, NULL, NULL, 4, 'normal', 'cancelled', NULL, 'Bulk seeded request 94', '2026-02-19 08:43:54', '2026-02-19 08:43:54', '2026-03-19 06:30:00'),
(161, 'SEED-REQ-0099', 16, 4, NULL, NULL, 1, 2, 'Seed request #99', 'Destination #3', '2026-03-20 12:30:00', '2026-03-20 13:30:00', NULL, NULL, NULL, NULL, 3, 'high', 'cancelled', NULL, 'Bulk seeded request 99', '2026-02-19 08:43:54', '2026-02-19 08:43:54', '2026-03-20 06:30:00'),
(162, 'SEED-REQ-0080', 17, 5, NULL, NULL, 1, 2, 'Seed request #80', 'Destination #8', '2026-03-16 14:00:00', '2026-03-16 15:00:00', NULL, NULL, NULL, NULL, 2, 'urgent', 'pending', NULL, 'Bulk seeded request 80', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(163, 'SEED-REQ-0085', 17, 4, NULL, NULL, 1, 2, 'Seed request #85', 'Destination #1', '2026-03-17 14:00:00', '2026-03-17 15:00:00', NULL, NULL, NULL, NULL, 1, 'low', 'pending', NULL, 'Bulk seeded request 85', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(164, 'SEED-REQ-0090', 17, 5, NULL, NULL, 1, 2, 'Seed request #90', 'Destination #6', '2026-03-18 14:00:00', '2026-03-18 15:00:00', NULL, NULL, NULL, NULL, 6, 'normal', 'pending', NULL, 'Bulk seeded request 90', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(165, 'SEED-REQ-0095', 17, 4, NULL, NULL, 1, 2, 'Seed request #95', 'Destination #11', '2026-03-19 14:00:00', '2026-03-19 15:00:00', NULL, NULL, NULL, NULL, 5, 'high', 'pending', NULL, 'Bulk seeded request 95', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL),
(166, 'SEED-REQ-0100', 17, 5, NULL, NULL, 1, 2, 'Seed request #100', 'Destination #4', '2026-03-20 14:00:00', '2026-03-20 15:00:00', NULL, NULL, NULL, NULL, 4, 'urgent', 'pending', NULL, 'Bulk seeded request 100', '2026-02-19 08:43:54', '2026-02-19 08:43:54', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `reservation_passengers`
--

CREATE TABLE `reservation_passengers` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `reservation_id` bigint(20) UNSIGNED NOT NULL,
  `full_name` varchar(180) NOT NULL,
  `contact_no` varchar(30) DEFAULT NULL,
  `notes` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `reservation_passengers`
--

INSERT INTO `reservation_passengers` (`id`, `reservation_id`, `full_name`, `contact_no`, `notes`, `created_at`) VALUES
(1, 2, 'Jules Aquino', '09171112222', 'Senior staff', '2026-02-19 06:12:06'),
(2, 2, 'Paolo Cruz', '09172223333', 'Project engineer', '2026-02-19 06:12:06');

-- --------------------------------------------------------

--
-- Table structure for table `roles`
--

CREATE TABLE `roles` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `roles`
--

INSERT INTO `roles` (`id`, `name`, `description`, `created_at`, `updated_at`) VALUES
(1, 'admin', 'Full system access', '2026-02-19 06:06:02', '2026-02-19 06:06:02'),
(2, 'manager', 'Coordinates fleet operations', '2026-02-19 06:06:02', '2026-02-19 06:06:02'),
(3, 'driver', 'Operates assigned vehicles', '2026-02-19 06:06:02', '2026-02-19 06:06:02'),
(4, 'requester', 'Creates reservation requests', '2026-02-19 06:06:02', '2026-02-19 06:06:02'),
(5, 'cao', 'Chief Administrative Officer approving travel requests', '2026-02-19 06:06:02', '2026-02-19 06:06:02');

-- --------------------------------------------------------

--
-- Table structure for table `trip_logs`
--

CREATE TABLE `trip_logs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `reservation_id` bigint(20) UNSIGNED NOT NULL,
  `driver_id` bigint(20) UNSIGNED DEFAULT NULL,
  `check_out_at` datetime DEFAULT NULL,
  `check_in_at` datetime DEFAULT NULL,
  `start_odometer_km` decimal(12,2) DEFAULT NULL,
  `end_odometer_km` decimal(12,2) DEFAULT NULL,
  `distance_km` decimal(12,2) DEFAULT NULL,
  `fuel_used_liters` decimal(10,2) DEFAULT NULL,
  `incident_report` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `trip_logs`
--

INSERT INTO `trip_logs` (`id`, `reservation_id`, `driver_id`, `check_out_at`, `check_in_at`, `start_odometer_km`, `end_odometer_km`, `distance_km`, `fuel_used_liters`, `incident_report`, `created_at`, `updated_at`) VALUES
(1, 1, 3, '2026-02-24 08:00:00', '2026-02-24 12:20:00', 32090.00, 32210.00, 120.00, 16.50, NULL, '2026-02-19 06:12:06', '2026-02-19 06:12:06');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `role_id` bigint(20) UNSIGNED NOT NULL,
  `employee_no` varchar(30) DEFAULT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `email` varchar(190) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `status` enum('active','inactive','suspended') NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `role_id`, `employee_no`, `first_name`, `last_name`, `email`, `password_hash`, `phone`, `status`, `created_at`, `updated_at`) VALUES
(1, 1, 'EMP-0001', 'System', 'Admin', 'admin@vmrs.local', '$2y$10$P9kDSAsV6lS.DaeHSGnBAORTAkCnemvF2tuOR2EVi8hrkNsiM0kGO', '09170000001', 'active', '2026-02-19 06:12:05', '2026-02-19 06:12:05'),
(2, 2, 'EMP-0002', 'Maya', 'Manager', 'manager@vmrs.local', '$2y$10$P9kDSAsV6lS.DaeHSGnBAORTAkCnemvF2tuOR2EVi8hrkNsiM0kGO', '09170000002', 'active', '2026-02-19 06:12:06', '2026-02-19 06:12:06'),
(3, 3, 'EMP-0003', 'Dan', 'Driver', 'driver1@vmrs.local', '$2y$10$P9kDSAsV6lS.DaeHSGnBAORTAkCnemvF2tuOR2EVi8hrkNsiM0kGO', '09170000003', 'active', '2026-02-19 06:12:06', '2026-02-19 06:12:06'),
(4, 4, 'EMP-0004', 'Rae', 'Requester', 'requester1@vmrs.local', '$2y$10$P9kDSAsV6lS.DaeHSGnBAORTAkCnemvF2tuOR2EVi8hrkNsiM0kGO', '09170000004', 'active', '2026-02-19 06:12:06', '2026-02-19 06:12:06'),
(5, 4, 'EMP-0005', 'Nico', 'Requester', 'requester2@vmrs.local', '$2y$10$P9kDSAsV6lS.DaeHSGnBAORTAkCnemvF2tuOR2EVi8hrkNsiM0kGO', '09170000005', 'active', '2026-02-19 06:12:06', '2026-02-19 06:12:06'),
(26, 3, 'EMP-0006', 'Lia', 'Driver', 'driver2@vmrs.local', '$2y$10$P9kDSAsV6lS.DaeHSGnBAORTAkCnemvF2tuOR2EVi8hrkNsiM0kGO', '09170000006', 'active', '2026-02-19 08:40:43', '2026-02-19 08:40:43'),
(27, 3, 'EMP-0007', 'Marco', 'Driver', 'driver3@vmrs.local', '$2y$10$P9kDSAsV6lS.DaeHSGnBAORTAkCnemvF2tuOR2EVi8hrkNsiM0kGO', '09170000007', 'active', '2026-02-19 08:40:43', '2026-02-19 08:40:43'),
(28, 3, 'EMP-0008', 'Ivy', 'Driver', 'driver4@vmrs.local', '$2y$10$P9kDSAsV6lS.DaeHSGnBAORTAkCnemvF2tuOR2EVi8hrkNsiM0kGO', '09170000008', 'active', '2026-02-19 08:40:43', '2026-02-19 08:40:43'),
(29, 3, 'EMP-0009', 'Noel', 'Driver', 'driver5@vmrs.local', '$2y$10$P9kDSAsV6lS.DaeHSGnBAORTAkCnemvF2tuOR2EVi8hrkNsiM0kGO', '09170000009', 'active', '2026-02-19 08:40:43', '2026-02-19 08:40:43'),
(30, 5, 'EMP-0010', 'Celia', 'Officer', 'cao@vmrs.local', '$2y$10$P9kDSAsV6lS.DaeHSGnBAORTAkCnemvF2tuOR2EVi8hrkNsiM0kGO', '09170000010', 'active', '2026-02-19 08:40:43', '2026-02-19 08:40:43');

-- --------------------------------------------------------

--
-- Table structure for table `vehicles`
--

CREATE TABLE `vehicles` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `vehicle_code` varchar(30) NOT NULL,
  `plate_no` varchar(30) NOT NULL,
  `vin` varchar(50) DEFAULT NULL,
  `type_id` bigint(20) UNSIGNED NOT NULL,
  `service_type` enum('ambulance','administrative') NOT NULL DEFAULT 'administrative',
  `current_location_id` bigint(20) UNSIGNED DEFAULT NULL,
  `make` varchar(80) NOT NULL,
  `model` varchar(80) NOT NULL,
  `year` smallint(5) UNSIGNED DEFAULT NULL,
  `color` varchar(40) DEFAULT NULL,
  `transmission` enum('manual','automatic','cvt','other') DEFAULT NULL,
  `fuel_type` enum('gasoline','diesel','electric','hybrid','lpg','other') DEFAULT NULL,
  `seats` tinyint(3) UNSIGNED DEFAULT NULL,
  `payload_kg` decimal(10,2) DEFAULT NULL,
  `odometer_km` decimal(12,2) NOT NULL DEFAULT 0.00,
  `status` enum('available','reserved','in_use','maintenance','inactive') NOT NULL DEFAULT 'available',
  `registration_expiry` date DEFAULT NULL,
  `insurance_expiry` date DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `vehicles`
--

INSERT INTO `vehicles` (`id`, `vehicle_code`, `plate_no`, `vin`, `type_id`, `service_type`, `current_location_id`, `make`, `model`, `year`, `color`, `transmission`, `fuel_type`, `seats`, `payload_kg`, `odometer_km`, `status`, `registration_expiry`, `insurance_expiry`, `notes`, `created_at`, `updated_at`) VALUES
(1, 'VH-0001', 'NAA-1001', '1HGBH41JXMN109186', 3, 'ambulance', 1, 'Toyota', 'Innova', 2023, 'Silver', 'automatic', 'diesel', 7, NULL, 32150.50, 'available', '2026-12-31', '2026-09-30', 'Primary transport unit', '2026-02-19 06:12:06', '2026-02-19 06:12:06'),
(2, 'VH-0002', 'NBB-2002', '2FMDK3GC0ABB12933', 2, 'administrative', 2, 'Mitsubishi', 'Montero', 2022, 'Black', 'automatic', 'diesel', 7, NULL, 44780.00, 'available', '2026-11-30', '2026-10-15', 'Executive transport', '2026-02-19 06:12:06', '2026-02-19 06:12:06'),
(3, 'VH-0003', 'NCC-3003', '3CZRE4H5XBG708352', 4, 'administrative', 3, 'Isuzu', 'N-Series', 2021, 'White', 'manual', 'diesel', 3, 1500.00, 58990.20, 'maintenance', '2026-08-30', '2026-08-15', 'Scheduled brake service', '2026-02-19 06:12:06', '2026-02-19 06:12:06'),
(16, 'VH-0004', 'NDD-4004', '5YJ3E1EA9JF123404', 1, 'administrative', 1, 'Honda', 'City', 2024, 'Blue', 'cvt', 'gasoline', 5, NULL, 11420.00, 'available', '2027-04-30', '2027-02-28', 'Pool sedan unit', '2026-02-19 08:40:43', '2026-02-19 08:40:43'),
(17, 'VH-0005', 'NEE-5005', 'JH4TB2H26CC000505', 5, 'administrative', 2, 'Yamaha', 'NMAX', 2024, 'Gray', 'automatic', 'gasoline', 2, NULL, 6350.00, 'available', '2027-05-31', '2027-03-31', 'Courier support bike', '2026-02-19 08:40:43', '2026-02-19 08:40:43');

-- --------------------------------------------------------

--
-- Table structure for table `vehicle_types`
--

CREATE TABLE `vehicle_types` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(80) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `vehicle_types`
--

INSERT INTO `vehicle_types` (`id`, `name`, `description`, `created_at`, `updated_at`) VALUES
(1, 'Sedan', 'Standard sedan vehicle', '2026-02-19 06:06:02', '2026-02-19 06:06:02'),
(2, 'SUV', 'Sport utility vehicle', '2026-02-19 06:06:02', '2026-02-19 06:06:02'),
(3, 'Van', 'Passenger or cargo van', '2026-02-19 06:06:02', '2026-02-19 06:06:02'),
(4, 'Truck', 'Utility truck', '2026-02-19 06:06:02', '2026-02-19 06:06:02'),
(5, 'Motorcycle', 'Two-wheel vehicle', '2026-02-19 06:06:02', '2026-02-19 06:06:02');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_audit_entity` (`entity_type`,`entity_id`),
  ADD KEY `idx_audit_user_date` (`user_id`,`created_at`);

--
-- Indexes for table `driver_profiles`
--
ALTER TABLE `driver_profiles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_driver_profiles_user` (`user_id`),
  ADD UNIQUE KEY `uk_driver_profiles_dl` (`dl_id_number`);

--
-- Indexes for table `driver_work_schedules`
--
ALTER TABLE `driver_work_schedules`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_driver_work_schedule_driver_date` (`driver_id`,`work_date`),
  ADD KEY `idx_driver_work_schedule_date` (`work_date`),
  ADD KEY `idx_driver_work_schedule_driver_date` (`driver_id`,`work_date`);

--
-- Indexes for table `fuel_logs`
--
ALTER TABLE `fuel_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_fuel_user` (`recorded_by`),
  ADD KEY `idx_fuel_vehicle_date` (`vehicle_id`,`fueled_at`);

--
-- Indexes for table `locations`
--
ALTER TABLE `locations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_locations_name` (`name`);

--
-- Indexes for table `maintenance_records`
--
ALTER TABLE `maintenance_records`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_maintenance_user` (`recorded_by`),
  ADD KEY `idx_maintenance_vehicle_date` (`vehicle_id`,`service_date`),
  ADD KEY `idx_maintenance_status` (`status`);

--
-- Indexes for table `reservations`
--
ALTER TABLE `reservations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `reservation_no` (`reservation_no`),
  ADD KEY `fk_reservations_approver` (`approver_id`),
  ADD KEY `fk_reservations_pickup_location` (`pickup_location_id`),
  ADD KEY `fk_reservations_dropoff_location` (`dropoff_location_id`),
  ADD KEY `idx_reservations_vehicle_time` (`vehicle_id`,`start_at`,`end_at`),
  ADD KEY `idx_reservations_status` (`status`),
  ADD KEY `idx_reservations_requester` (`requester_id`),
  ADD KEY `fk_reservations_assigned_driver` (`assigned_driver_id`);

--
-- Indexes for table `reservation_passengers`
--
ALTER TABLE `reservation_passengers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_passengers_reservation` (`reservation_id`);

--
-- Indexes for table `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `trip_logs`
--
ALTER TABLE `trip_logs`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_trip_reservation` (`reservation_id`),
  ADD KEY `fk_trip_driver` (`driver_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD UNIQUE KEY `employee_no` (`employee_no`),
  ADD KEY `fk_users_role` (`role_id`);

--
-- Indexes for table `vehicles`
--
ALTER TABLE `vehicles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `vehicle_code` (`vehicle_code`),
  ADD UNIQUE KEY `plate_no` (`plate_no`),
  ADD UNIQUE KEY `vin` (`vin`),
  ADD KEY `fk_vehicles_type` (`type_id`),
  ADD KEY `fk_vehicles_location` (`current_location_id`),
  ADD KEY `idx_vehicles_status` (`status`),
  ADD KEY `idx_vehicles_make_model` (`make`,`model`);

--
-- Indexes for table `vehicle_types`
--
ALTER TABLE `vehicle_types`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `audit_logs`
--
ALTER TABLE `audit_logs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `driver_profiles`
--
ALTER TABLE `driver_profiles`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `driver_work_schedules`
--
ALTER TABLE `driver_work_schedules`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=251;

--
-- AUTO_INCREMENT for table `fuel_logs`
--
ALTER TABLE `fuel_logs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `locations`
--
ALTER TABLE `locations`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=32;

--
-- AUTO_INCREMENT for table `maintenance_records`
--
ALTER TABLE `maintenance_records`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `reservations`
--
ALTER TABLE `reservations`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `reservation_passengers`
--
ALTER TABLE `reservation_passengers`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `roles`
--
ALTER TABLE `roles`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `trip_logs`
--
ALTER TABLE `trip_logs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=84;

--
-- AUTO_INCREMENT for table `vehicles`
--
ALTER TABLE `vehicles`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=48;

--
-- AUTO_INCREMENT for table `vehicle_types`
--
ALTER TABLE `vehicle_types`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD CONSTRAINT `fk_audit_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `driver_profiles`
--
ALTER TABLE `driver_profiles`
  ADD CONSTRAINT `fk_driver_profiles_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `driver_work_schedules`
--
ALTER TABLE `driver_work_schedules`
  ADD CONSTRAINT `fk_driver_work_schedule_driver` FOREIGN KEY (`driver_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `fuel_logs`
--
ALTER TABLE `fuel_logs`
  ADD CONSTRAINT `fk_fuel_user` FOREIGN KEY (`recorded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_fuel_vehicle` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `maintenance_records`
--
ALTER TABLE `maintenance_records`
  ADD CONSTRAINT `fk_maintenance_user` FOREIGN KEY (`recorded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_maintenance_vehicle` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `reservations`
--
ALTER TABLE `reservations`
  ADD CONSTRAINT `fk_reservations_approver` FOREIGN KEY (`approver_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_reservations_assigned_driver` FOREIGN KEY (`assigned_driver_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_reservations_dropoff_location` FOREIGN KEY (`dropoff_location_id`) REFERENCES `locations` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_reservations_pickup_location` FOREIGN KEY (`pickup_location_id`) REFERENCES `locations` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_reservations_requester` FOREIGN KEY (`requester_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_reservations_vehicle` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `reservation_passengers`
--
ALTER TABLE `reservation_passengers`
  ADD CONSTRAINT `fk_passengers_reservation` FOREIGN KEY (`reservation_id`) REFERENCES `reservations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `trip_logs`
--
ALTER TABLE `trip_logs`
  ADD CONSTRAINT `fk_trip_driver` FOREIGN KEY (`driver_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_trip_reservation` FOREIGN KEY (`reservation_id`) REFERENCES `reservations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `fk_users_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `vehicles`
--
ALTER TABLE `vehicles`
  ADD CONSTRAINT `fk_vehicles_location` FOREIGN KEY (`current_location_id`) REFERENCES `locations` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_vehicles_type` FOREIGN KEY (`type_id`) REFERENCES `vehicle_types` (`id`) ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
