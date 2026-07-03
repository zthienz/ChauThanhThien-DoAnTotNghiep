<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        // MySQL không hỗ trợ ALTER COLUMN trực tiếp cho ENUM nên dùng raw SQL
        DB::statement("ALTER TABLE xe MODIFY COLUMN hang_bang ENUM('A1','A','B1','B2','C1','C','C2','D','E','CE') NOT NULL DEFAULT 'B2'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE xe MODIFY COLUMN hang_bang ENUM('A1','A','B1','B2','C1','C','D','E','CE') NOT NULL DEFAULT 'B2'");
    }
};
