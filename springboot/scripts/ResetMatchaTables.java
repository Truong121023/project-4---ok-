import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

public class ResetMatchaTables {

	public static void main(String[] args) throws Exception {
		String url = "jdbc:mysql://127.0.0.1:3306/matcha_tea?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=Asia/Ho_Chi_Minh";
		try (Connection connection = DriverManager.getConnection(url, "matcha_user", "12345678");
			 Statement statement = connection.createStatement()) {
			List<String> tables = new ArrayList<>();
			try (ResultSet resultSet = statement.executeQuery(
					"select table_name from information_schema.tables where table_schema = database() and table_type = 'BASE TABLE'"
			)) {
				while (resultSet.next()) {
					tables.add(resultSet.getString(1));
				}
			}

			statement.execute("SET FOREIGN_KEY_CHECKS = 0");
			for (String table : tables) {
				statement.execute("DROP TABLE IF EXISTS `" + table + "`");
				System.out.println("dropped: " + table);
			}
			statement.execute("SET FOREIGN_KEY_CHECKS = 1");
			System.out.println("Dropped tables: " + tables.size());
		}
	}
}
