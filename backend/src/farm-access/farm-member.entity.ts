import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { User } from '../auth/user.entity';
import { Farm } from '../farms/farm.entity';

// Per-farm membership role. Owners have full access; workers get broad
// operational access (field logs + read inventory) but no economics.
export type FarmRole = 'owner' | 'worker';

@Entity('farm_members')
@Index(['farmId', 'userId'], { unique: true })
export class FarmMember {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Index()
    @Column({ name: 'farm_id', type: 'uuid' })
    farmId: string;

    @ManyToOne(() => Farm, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'farm_id' })
    farm: Farm;

    @Index()
    @Column({ name: 'user_id', type: 'uuid' })
    userId: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ type: 'varchar', length: 20, default: 'worker' })
    role: FarmRole;

    // Who added this member (the owner who scanned/entered them). Nullable so a
    // user deletion doesn't cascade-remove the membership row.
    @Column({ name: 'added_by_id', type: 'uuid', nullable: true })
    addedById: string | null;

    @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'added_by_id' })
    addedBy: User | null;

    @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
    createdAt: Date;
}
