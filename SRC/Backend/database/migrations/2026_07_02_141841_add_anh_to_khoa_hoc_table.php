<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('khoa_hoc', function (Blueprint $table) {
            $table->string('anh')->nullable()->after('mo_ta')
                ->comment('Ảnh đại diện cho loại bằng lái');
        });
    }

    public function down(): void
    {
        Schema::table('khoa_hoc', function (Blueprint $table) {
            $table->dropColumn('anh');
        });
    }
};
