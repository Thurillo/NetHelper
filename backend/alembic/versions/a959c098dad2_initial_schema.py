"""initial schema

Revision ID: a959c098dad2
Revises:
Create Date: 2026-03-21 20:00:00.000000

"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.types import Numeric
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'a959c098dad2'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── user ──────────────────────────────────────────────────────────────────
    op.create_table(
        'user',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('username', sa.String(150), nullable=False),
        sa.Column('email', sa.String(255), nullable=True),
        sa.Column('hashed_password', sa.String(255), nullable=False),
        sa.Column('role',
                  sa.Enum('admin', 'readonly', name='userrole'),
                  nullable=False, server_default='readonly'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.func.now()),
        sa.Column('last_login', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_user_id', 'user', ['id'])
    op.create_index('ix_user_username', 'user', ['username'], unique=True)
    op.create_index('ix_user_email', 'user', ['email'], unique=True)

    # ── vendor ────────────────────────────────────────────────────────────────
    op.create_table(
        'vendor',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(150), nullable=False),
        sa.Column('slug', sa.String(100), nullable=False),
        sa.Column('snmp_default_community', sa.String(255), nullable=True),
        sa.Column('snmp_default_version', sa.Integer(), nullable=False, server_default='2'),
        sa.Column('snmp_v3_default_username', sa.String(150), nullable=True),
        sa.Column('ssh_default_username', sa.String(150), nullable=True),
        sa.Column('ssh_default_password_enc', sa.Text(), nullable=True),
        sa.Column('ssh_default_port', sa.Integer(), nullable=False, server_default='22'),
        sa.Column('driver_class', sa.String(100), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_vendor_id', 'vendor', ['id'])
    op.create_index('ix_vendor_slug', 'vendor', ['slug'], unique=True)

    # ── site ──────────────────────────────────────────────────────────────────
    # NOTE: floor_plan and floor_plan_name are NOT here — added by migration b2c3d4e5f6a7
    op.create_table(
        'site',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(150), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name', name='uq_site_name'),
    )
    op.create_index('ix_site_id', 'site', ['id'])
    op.create_index('ix_site_name', 'site', ['name'])

    # ── cabinet ───────────────────────────────────────────────────────────────
    # NOTE: map_x and map_y are NOT here — added by migration b2c3d4e5f6a7
    op.create_table(
        'cabinet',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('site_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(150), nullable=False),
        sa.Column('u_count', sa.Integer(), nullable=False, server_default='42'),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('row_label', sa.String(50), nullable=True),
        sa.Column('position', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['site_id'], ['site.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('site_id', 'name', name='uq_cabinet_site_name'),
    )
    op.create_index('ix_cabinet_id', 'cabinet', ['id'])
    op.create_index('ix_cabinet_site_id', 'cabinet', ['site_id'])

    # ── vlan ──────────────────────────────────────────────────────────────────
    op.create_table(
        'vlan',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('site_id', sa.Integer(), nullable=True),
        sa.Column('vid', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(150), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status',
                  sa.Enum('active', 'reserved', 'deprecated', name='vlanstatus'),
                  nullable=False, server_default='active'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.func.now()),
        sa.CheckConstraint('vid >= 1 AND vid <= 4094', name='ck_vlan_vid_range'),
        sa.ForeignKeyConstraint(['site_id'], ['site.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('site_id', 'vid', name='uq_vlan_site_vid'),
    )
    op.create_index('ix_vlan_id', 'vlan', ['id'])
    op.create_index('ix_vlan_site_id', 'vlan', ['site_id'])

    # ── ip_prefix ─────────────────────────────────────────────────────────────
    # NOTE: PrefixStatus WITHOUT 'container' — added by migration f6a0c3d4e5b7
    op.create_table(
        'ip_prefix',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('site_id', sa.Integer(), nullable=True),
        sa.Column('vlan_id', sa.Integer(), nullable=True),
        sa.Column('prefix', sa.String(50), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_pool', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('status',
                  sa.Enum('active', 'reserved', 'deprecated', name='prefixstatus'),
                  nullable=False, server_default='active'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['site_id'], ['site.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['vlan_id'], ['vlan.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('prefix', name='uq_ip_prefix_prefix'),
    )
    op.create_index('ix_ip_prefix_id', 'ip_prefix', ['id'])
    op.create_index('ix_ip_prefix_site_id', 'ip_prefix', ['site_id'])
    op.create_index('ix_ip_prefix_vlan_id', 'ip_prefix', ['vlan_id'])

    # ── device ────────────────────────────────────────────────────────────────
    # NOTE: DeviceType WITHOUT workstation/printer/camera/phone (added by f6a0c3d4e5b7)
    # NOTE: mac_address column NOT here — added by migration c61dca1aad09
    op.create_table(
        'device',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('site_id', sa.Integer(), nullable=True),
        sa.Column('cabinet_id', sa.Integer(), nullable=True),
        sa.Column('vendor_id', sa.Integer(), nullable=True),
        sa.Column('name', sa.String(150), nullable=False),
        sa.Column('device_type',
                  sa.Enum(
                      'switch', 'router', 'access_point', 'server',
                      'patch_panel', 'pdu', 'firewall', 'ups',
                      'unmanaged_switch', 'other',
                      name='devicetype',
                  ),
                  nullable=False, server_default='switch'),
        sa.Column('status',
                  sa.Enum('active', 'inactive', 'planned', 'decommissioned',
                          name='devicestatus'),
                  nullable=False, server_default='active'),
        sa.Column('model', sa.String(150), nullable=True),
        sa.Column('serial_number', sa.String(150), nullable=True),
        sa.Column('asset_tag', sa.String(100), nullable=True),
        sa.Column('u_position', sa.SmallInteger(), nullable=True),
        sa.Column('u_height', sa.SmallInteger(), nullable=False, server_default='1'),
        sa.Column('primary_ip', sa.String(50), nullable=True),
        # SNMP per-device overrides
        sa.Column('snmp_community', sa.String(255), nullable=True),
        sa.Column('snmp_version', sa.SmallInteger(), nullable=False, server_default='2'),
        sa.Column('snmp_v3_username', sa.String(150), nullable=True),
        sa.Column('snmp_v3_auth_protocol', sa.String(50), nullable=True),
        sa.Column('snmp_v3_auth_password_enc', sa.Text(), nullable=True),
        sa.Column('snmp_v3_priv_protocol', sa.String(50), nullable=True),
        sa.Column('snmp_v3_priv_password_enc', sa.Text(), nullable=True),
        # SSH per-device overrides
        sa.Column('ssh_username', sa.String(150), nullable=True),
        sa.Column('ssh_password_enc', sa.Text(), nullable=True),
        sa.Column('ssh_key_path', sa.String(500), nullable=True),
        sa.Column('ssh_port', sa.SmallInteger(), nullable=True),
        # Misc
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('last_seen', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_unmanaged_suspected', sa.Boolean(), nullable=False,
                  server_default=sa.false()),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['cabinet_id'], ['cabinet.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['site_id'], ['site.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['vendor_id'], ['vendor.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_device_id', 'device', ['id'])
    op.create_index('ix_device_name', 'device', ['name'])
    op.create_index('ix_device_site_id', 'device', ['site_id'])
    op.create_index('ix_device_cabinet_id', 'device', ['cabinet_id'])
    op.create_index('ix_device_vendor_id', 'device', ['vendor_id'])

    # ── interface ─────────────────────────────────────────────────────────────
    op.create_table(
        'interface',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('device_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(150), nullable=False),
        sa.Column('label', sa.String(150), nullable=True),
        sa.Column('if_type',
                  sa.Enum(
                      'ethernet', 'fiber', 'sfp', 'sfp_plus', 'lag',
                      'loopback', 'vlan_if', 'wireless', 'patch_panel_port', 'other',
                      name='interfacetype',
                  ),
                  nullable=False, server_default='ethernet'),
        sa.Column('mac_address', sa.String(20), nullable=True),
        sa.Column('speed_mbps', sa.Integer(), nullable=True),
        sa.Column('mtu', sa.Integer(), nullable=True),
        sa.Column('admin_up', sa.Boolean(), nullable=True),
        sa.Column('oper_up', sa.Boolean(), nullable=True),
        sa.Column('if_index', sa.Integer(), nullable=True),
        sa.Column('vlan_id', sa.Integer(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('room_destination', sa.String(255), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['device_id'], ['device.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['vlan_id'], ['vlan.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('device_id', 'name', name='uq_interface_device_name'),
    )
    op.create_index('ix_interface_id', 'interface', ['id'])
    op.create_index('ix_interface_device_id', 'interface', ['device_id'])
    op.create_index('ix_interface_mac_address', 'interface', ['mac_address'])
    op.create_index('ix_interface_vlan_id', 'interface', ['vlan_id'])

    # ── interface_vlan ────────────────────────────────────────────────────────
    op.create_table(
        'interface_vlan',
        sa.Column('interface_id', sa.Integer(), nullable=False),
        sa.Column('vlan_id', sa.Integer(), nullable=False),
        sa.Column('is_tagged', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.ForeignKeyConstraint(['interface_id'], ['interface.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['vlan_id'], ['vlan.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('interface_id', 'vlan_id', name='pk_interface_vlan'),
    )
    op.create_index('ix_interface_vlan_interface_id', 'interface_vlan', ['interface_id'])
    op.create_index('ix_interface_vlan_vlan_id', 'interface_vlan', ['vlan_id'])

    # ── cable ─────────────────────────────────────────────────────────────────
    op.create_table(
        'cable',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('interface_a_id', sa.Integer(), nullable=False),
        sa.Column('interface_b_id', sa.Integer(), nullable=False),
        sa.Column('cable_type',
                  sa.Enum('cat5e', 'cat6', 'cat6a', 'cat7',
                          'fiber_sm', 'fiber_mm', 'dac', 'other',
                          name='cabletype'),
                  nullable=False, server_default='cat6'),
        sa.Column('label', sa.String(150), nullable=True),
        sa.Column('length_m', Numeric(7, 2), nullable=True),
        sa.Column('color', sa.String(50), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.func.now()),
        sa.CheckConstraint('interface_a_id != interface_b_id', name='ck_cable_no_self_loop'),
        sa.CheckConstraint('interface_a_id < interface_b_id', name='ck_cable_ordered_interfaces'),
        sa.ForeignKeyConstraint(['interface_a_id'], ['interface.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['interface_b_id'], ['interface.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('interface_a_id', 'interface_b_id', name='uq_cable_interfaces'),
    )
    op.create_index('ix_cable_id', 'cable', ['id'])
    op.create_index('ix_cable_interface_a_id', 'cable', ['interface_a_id'])
    op.create_index('ix_cable_interface_b_id', 'cable', ['interface_b_id'])

    # ── ip_address ────────────────────────────────────────────────────────────
    op.create_table(
        'ip_address',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('address', sa.String(50), nullable=False),
        sa.Column('interface_id', sa.Integer(), nullable=True),
        sa.Column('device_id', sa.Integer(), nullable=True),
        sa.Column('prefix_id', sa.Integer(), nullable=True),
        sa.Column('is_primary', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('dns_name', sa.String(255), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('source',
                  sa.Enum('manual', 'snmp_arp', 'snmp_if', 'ip_range_scan',
                          name='ipaddresssource'),
                  nullable=False, server_default='manual'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['device_id'], ['device.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['interface_id'], ['interface.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['prefix_id'], ['ip_prefix.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_ip_address_id', 'ip_address', ['id'])
    op.create_index('ix_ip_address_address', 'ip_address', ['address'], unique=True)
    op.create_index('ix_ip_address_interface_id', 'ip_address', ['interface_id'])
    op.create_index('ix_ip_address_device_id', 'ip_address', ['device_id'])
    op.create_index('ix_ip_address_prefix_id', 'ip_address', ['prefix_id'])

    # ── scan_job ──────────────────────────────────────────────────────────────
    op.create_table(
        'scan_job',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('device_id', sa.Integer(), nullable=True),
        sa.Column('scan_type',
                  sa.Enum('snmp_full', 'snmp_arp', 'snmp_mac', 'snmp_lldp',
                          'ssh_full', 'ip_range',
                          name='scantype'),
                  nullable=False),
        sa.Column('status',
                  sa.Enum('pending', 'running', 'completed', 'failed', 'cancelled',
                          name='scanstatus'),
                  nullable=False, server_default='pending'),
        sa.Column('range_start_ip', sa.String(50), nullable=True),
        sa.Column('range_end_ip', sa.String(50), nullable=True),
        sa.Column('range_ports', sa.JSON(), nullable=True),
        sa.Column('celery_task_id', sa.String(255), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('result_summary', sa.JSON(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('log_output', sa.Text(), nullable=True),
        sa.Column('triggered_by_user_id', sa.Integer(), nullable=True),
        sa.Column('is_scheduled', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['device_id'], ['device.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['triggered_by_user_id'], ['user.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_scan_job_id', 'scan_job', ['id'])
    op.create_index('ix_scan_job_device_id', 'scan_job', ['device_id'])
    op.create_index('ix_scan_job_celery_task_id', 'scan_job', ['celery_task_id'])
    op.create_index('ix_scan_job_triggered_by_user_id', 'scan_job', ['triggered_by_user_id'])
    op.create_index('ix_scan_job_created_at', 'scan_job', ['created_at'])

    # ── mac_entry ─────────────────────────────────────────────────────────────
    op.create_table(
        'mac_entry',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('scan_job_id', sa.Integer(), nullable=True),
        sa.Column('device_id', sa.Integer(), nullable=False),
        sa.Column('interface_id', sa.Integer(), nullable=True),
        sa.Column('mac_address', sa.String(20), nullable=False),
        sa.Column('vlan_id', sa.SmallInteger(), nullable=True),
        sa.Column('ip_address', sa.String(50), nullable=True),
        sa.Column('hostname', sa.String(255), nullable=True),
        sa.Column('seen_at', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.func.now()),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('source',
                  sa.Enum('scan', 'manual', name='macentrysource'),
                  nullable=False, server_default='scan'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['device_id'], ['device.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['interface_id'], ['interface.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['scan_job_id'], ['scan_job.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_mac_entry_id', 'mac_entry', ['id'])
    op.create_index('ix_mac_entry_scan_job_id', 'mac_entry', ['scan_job_id'])
    op.create_index('ix_mac_entry_device_id', 'mac_entry', ['device_id'])
    op.create_index('ix_mac_entry_interface_id', 'mac_entry', ['interface_id'])
    op.create_index('ix_mac_entry_mac_address', 'mac_entry', ['mac_address'])

    # ── scan_conflict ─────────────────────────────────────────────────────────
    # NOTE: ConflictType WITHOUT 'duplicate_device' (added by d4f8a1b2c3e5)
    #       and WITHOUT 'port_cable_conflict' (added by e5f9b2c3d4a6)
    op.create_table(
        'scan_conflict',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('scan_job_id', sa.Integer(), nullable=True),
        sa.Column('device_id', sa.Integer(), nullable=True),
        sa.Column('conflict_type',
                  sa.Enum(
                      'new_interface', 'changed_ip', 'missing_interface',
                      'new_mac', 'changed_mac', 'suspected_unmanaged_switch',
                      'new_device_discovered', 'changed_hostname', 'other',
                      name='conflicttype',
                  ),
                  nullable=False),
        sa.Column('entity_table', sa.String(100), nullable=True),
        sa.Column('entity_id', sa.Integer(), nullable=True),
        sa.Column('field_name', sa.String(100), nullable=True),
        sa.Column('current_value', sa.JSON(), nullable=True),
        sa.Column('discovered_value', sa.JSON(), nullable=True),
        sa.Column('status',
                  sa.Enum('pending', 'accepted', 'rejected', 'ignored',
                          name='conflictstatus'),
                  nullable=False, server_default='pending'),
        sa.Column('resolved_by_user_id', sa.Integer(), nullable=True),
        sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['device_id'], ['device.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['resolved_by_user_id'], ['user.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['scan_job_id'], ['scan_job.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_scan_conflict_id', 'scan_conflict', ['id'])
    op.create_index('ix_scan_conflict_scan_job_id', 'scan_conflict', ['scan_job_id'])
    op.create_index('ix_scan_conflict_device_id', 'scan_conflict', ['device_id'])
    op.create_index('ix_scan_conflict_conflict_type', 'scan_conflict', ['conflict_type'])
    op.create_index('ix_scan_conflict_status', 'scan_conflict', ['status'])
    op.create_index('ix_scan_conflict_created_at', 'scan_conflict', ['created_at'])

    # ── audit_log ─────────────────────────────────────────────────────────────
    op.create_table(
        'audit_log',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.func.now()),
        sa.Column('action',
                  sa.Enum('create', 'update', 'delete', 'login', 'logout',
                          'scan_accept', 'scan_reject',
                          name='auditaction'),
                  nullable=False),
        sa.Column('entity_table', sa.String(100), nullable=True),
        sa.Column('entity_id', sa.Integer(), nullable=True),
        sa.Column('field_name', sa.String(100), nullable=True),
        sa.Column('old_value', sa.JSON(), nullable=True),
        sa.Column('new_value', sa.JSON(), nullable=True),
        sa.Column('client_ip', sa.String(50), nullable=True),
        sa.Column('description', sa.String(500), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_audit_log_id', 'audit_log', ['id'])
    op.create_index('ix_audit_log_user_id', 'audit_log', ['user_id'])
    op.create_index('ix_audit_log_timestamp', 'audit_log', ['timestamp'])
    op.create_index('ix_audit_log_action', 'audit_log', ['action'])
    op.create_index('ix_audit_log_entity_table', 'audit_log', ['entity_table'])
    op.create_index('ix_audit_log_entity_id', 'audit_log', ['entity_id'])

    # ── scheduled_scan ────────────────────────────────────────────────────────
    op.create_table(
        'scheduled_scan',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('device_id', sa.Integer(), nullable=False),
        sa.Column('scan_type', sa.String(50), nullable=False),
        sa.Column('cron_expression', sa.String(100), nullable=False),
        sa.Column('enabled', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('last_run', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['device_id'], ['device.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_scheduled_scan_id', 'scheduled_scan', ['id'])
    op.create_index('ix_scheduled_scan_device_id', 'scheduled_scan', ['device_id'])


def downgrade() -> None:
    op.drop_table('scheduled_scan')
    op.drop_table('audit_log')
    op.drop_table('scan_conflict')
    op.drop_table('mac_entry')
    op.drop_table('scan_job')
    op.drop_table('ip_address')
    op.drop_table('cable')
    op.drop_table('interface_vlan')
    op.drop_table('interface')
    op.drop_table('device')
    op.drop_table('ip_prefix')
    op.drop_table('vlan')
    op.drop_table('cabinet')
    op.drop_table('site')
    op.drop_table('vendor')
    op.drop_table('user')

    # Drop enum types
    sa.Enum(name='auditaction').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='conflictstatus').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='conflicttype').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='macentrysource').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='scanstatus').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='scantype').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='ipaddresssource').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='cabletype').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='interfacetype').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='devicestatus').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='devicetype').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='prefixstatus').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='vlanstatus').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='userrole').drop(op.get_bind(), checkfirst=True)
